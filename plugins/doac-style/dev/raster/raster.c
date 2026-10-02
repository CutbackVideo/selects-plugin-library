/*
 * DOAC Style caption raster core (WebAssembly).
 *
 * FreeType 2.14.3 plus the parts of Pillow 12.3.0 the caption engine uses:
 * the basic-layout text path of _imagingft.c (getlength, getsize/getbbox,
 * render with stroke), and libImaging's Resample, BoxBlur, Paste/Fill, Crop
 * and GetBBox. The text functions below follow _imagingft.c line by line so
 * the panel draws the same pixels Pillow draws on macOS.
 */
#include "Imaging.h"
#include <ft2build.h>
#include FT_FREETYPE_H
#include FT_GLYPH_H
#include FT_BITMAP_H
#include FT_STROKER_H

#define EXPORT __attribute__((visibility("default")))
#define PIXEL(x) ((((x) + 32) & -64) >> 6)

/* ---------------------------------------------------------------- storage */
/* One block per image, rows contiguous (linesize apart). */

void *ImagingError_MemoryError(void) { return NULL; }
void *ImagingError_ValueError(const char *m) { (void)m; return NULL; }
void *ImagingError_ModeError(void) { return NULL; }
void *ImagingError_Mismatch(void) { return NULL; }
void ImagingSectionEnter(ImagingSectionCookie *c) { (void)c; }
void ImagingSectionLeave(ImagingSectionCookie *c) { (void)c; }
void ImagingCopyPalette(Imaging a, Imaging b) { (void)a; (void)b; }

static void destroy_block(Imaging im) { free(im->block); }

Imaging ImagingNewDirty(ModeID mode, int xsize, int ysize) {
    Imaging im = (Imaging)calloc(1, sizeof(struct ImagingMemoryInstance));
    int y;
    if (!im) return NULL;
    im->xsize = xsize;
    im->ysize = ysize;
    im->refcount = 1;
    im->type = IMAGING_TYPE_UINT8;
    if (mode == IMAGING_MODE_L) {
        im->bands = im->pixelsize = 1;
    } else if (mode == IMAGING_MODE_RGB) {
        im->bands = 3;
        im->pixelsize = 4;
    } else if (mode == IMAGING_MODE_RGBA) {
        im->bands = im->pixelsize = 4;
    } else {
        free(im);
        return NULL;
    }
    im->mode = mode;
    im->linesize = xsize * im->pixelsize;
    im->image = (char **)calloc(ysize > 0 ? ysize : 1, sizeof(void *));
    im->block = (char *)malloc((size_t)(im->linesize > 0 ? im->linesize : 1) * (ysize > 0 ? ysize : 1));
    if (!im->image || !im->block) {
        free(im->image);
        free(im->block);
        free(im);
        return NULL;
    }
    for (y = 0; y < ysize; y++) im->image[y] = im->block + (size_t)y * im->linesize;
    if (im->pixelsize == 1) im->image8 = (UINT8 **)im->image;
    else im->image32 = (INT32 **)im->image;
    im->destroy = destroy_block;
    return im;
}

Imaging ImagingNew(ModeID mode, int xsize, int ysize) {
    Imaging im = ImagingNewDirty(mode, xsize, ysize);
    if (im) memset(im->block, 0, (size_t)im->linesize * im->ysize);
    return im;
}

Imaging ImagingNew2Dirty(ModeID mode, Imaging imOut, Imaging imIn) {
    if (imOut) {
        if (imOut->mode != mode || imOut->xsize != imIn->xsize || imOut->ysize != imIn->ysize) return NULL;
        return imOut;
    }
    return ImagingNewDirty(mode, imIn->xsize, imIn->ysize);
}

void ImagingDelete(Imaging im) {
    if (!im) return;
    if (im->destroy) im->destroy(im);
    free(im->image);
    free(im);
}


static ModeID mode_of(int m) {
    return m == 0 ? IMAGING_MODE_L : m == 1 ? IMAGING_MODE_RGB : IMAGING_MODE_RGBA;
}

EXPORT void *dc_malloc(int n) { return malloc(n > 0 ? n : 1); }
EXPORT void dc_free(void *p) { free(p); }

/* Image.new(mode, size, color): every byte of a pixel set from `rgba`. */
EXPORT Imaging img_new(int mode, int w, int h, unsigned int rgba) {
    Imaging im = ImagingNewDirty(mode_of(mode), w, h);
    int y, x, i;
    UINT8 ink[4];
    if (!im) return NULL;
    ink[0] = rgba & 255; ink[1] = (rgba >> 8) & 255; ink[2] = (rgba >> 16) & 255; ink[3] = (rgba >> 24) & 255;
    for (y = 0; y < h; y++) {
        UINT8 *row = (UINT8 *)im->image[y];
        if (im->pixelsize == 1) memset(row, ink[0], w);
        else for (x = 0; x < w; x++) for (i = 0; i < 4; i++) row[x * 4 + i] = ink[i];
    }
    return im;
}
EXPORT void img_free(Imaging im) { ImagingDelete(im); }
EXPORT char *img_data(Imaging im) { return im->block; }
EXPORT int img_width(Imaging im) { return im->xsize; }
EXPORT int img_height(Imaging im) { return im->ysize; }
EXPORT int img_linesize(Imaging im) { return im->linesize; }
EXPORT Imaging img_copy(Imaging im) { return ImagingCopy(im); }

/* Image.resize(size, resample): a same-size request is a copy, as in Pillow. */
EXPORT Imaging img_resize(Imaging im, int w, int h, int filter) {
    float box[4];
    if (w == im->xsize && h == im->ysize) return ImagingCopy(im);
    box[0] = 0; box[1] = 0; box[2] = (float)im->xsize; box[3] = (float)im->ysize;
    return ImagingResample(im, w, h, filter, box);
}

/* Image.filter(GaussianBlur(r)) */
EXPORT Imaging img_gaussian_blur(Imaging im, float rx, float ry) {
    Imaging out;
    if (rx == 0 && ry == 0) return ImagingCopy(im);
    out = ImagingNewDirty(im->mode, im->xsize, im->ysize);
    if (!out) return NULL;
    if (!ImagingGaussianBlur(out, im, rx, ry, 3)) { ImagingDelete(out); return NULL; }
    return out;
}

/* Image.paste(color, (x, y), mask) */
EXPORT int img_fill_mask(Imaging im, unsigned int rgba, Imaging mask, int x, int y) {
    UINT8 ink[4];
    ink[0] = rgba & 255; ink[1] = (rgba >> 8) & 255; ink[2] = (rgba >> 16) & 255; ink[3] = (rgba >> 24) & 255;
    return ImagingFill2(im, ink, mask, x, y, x + mask->xsize, y + mask->ysize);
}

/* Image.paste(color, box) without a mask */
EXPORT int img_fill_box(Imaging im, unsigned int rgba, int x0, int y0, int x1, int y1) {
    UINT8 ink[4];
    ink[0] = rgba & 255; ink[1] = (rgba >> 8) & 255; ink[2] = (rgba >> 16) & 255; ink[3] = (rgba >> 24) & 255;
    return ImagingFill2(im, ink, NULL, x0, y0, x1, y1);
}

/* Image.paste(image, (x, y)) */
EXPORT int img_paste(Imaging im, Imaging src, int x, int y) {
    return ImagingPaste(im, src, NULL, x, y, x + src->xsize, y + src->ysize);
}

EXPORT Imaging img_crop(Imaging im, int x0, int y0, int x1, int y1) {
    return ImagingCrop(im, x0, y0, x1, y1);
}

/* Image.getbbox(); returns 0 for an empty image. */
EXPORT int img_getbbox(Imaging im, int *out) {
    return ImagingGetBBox(im, out, 1);
}

/* ------------------------------------------------------------------ fonts */

typedef struct {
    int index, x_offset, x_advance, y_offset, y_advance;
    unsigned int cluster;
} GlyphInfo;

typedef struct {
    FT_Face face;
    unsigned char *bytes;
} Font;

static FT_Library library = NULL;

/* ImageFont.truetype(bytes, size, index) */
EXPORT Font *font_new(const unsigned char *data, int len, int index, float size) {
    Font *self;
    FT_Size_RequestRec req;
    FT_Long width;
    int error;
    if (!library && FT_Init_FreeType(&library)) return NULL;
    self = (Font *)calloc(1, sizeof(Font));
    if (!self) return NULL;
    self->bytes = (unsigned char *)malloc(len);
    if (!self->bytes) { free(self); return NULL; }
    memcpy(self->bytes, data, len);
    error = FT_New_Memory_Face(library, self->bytes, len, index, &self->face);
    if (!error) {
        width = size * 64;
        req.type = FT_SIZE_REQUEST_TYPE_NOMINAL;
        req.width = width;
        req.height = width;
        req.horiResolution = 0;
        req.vertResolution = 0;
        error = FT_Request_Size(self->face, &req);
    }
    if (error) {
        if (self->face) FT_Done_Face(self->face);
        free(self->bytes);
        free(self);
        return NULL;
    }
    return self;
}

EXPORT void font_free(Font *self) {
    if (!self) return;
    FT_Done_Face(self->face);
    free(self->bytes);
    free(self);
}

EXPORT int font_ascender(Font *self) { return (int)self->face->size->metrics.ascender; }
EXPORT int font_descender(Font *self) { return (int)self->face->size->metrics.descender; }

/* _imagingft.c text_layout_fallback (mask = 0, color = 0) */
static int text_layout(Font *self, const unsigned int *text, int count, GlyphInfo **glyph_info) {
    int error, load_flags, i;
    FT_ULong ch;
    FT_GlyphSlot glyph;
    FT_Bool kerning = FT_HAS_KERNING(self->face);
    FT_UInt last_index = 0;
    *glyph_info = NULL;
    if (count == 0) return 0;
    *glyph_info = (GlyphInfo *)calloc(count, sizeof(GlyphInfo));
    if (!*glyph_info) return -1;
    load_flags = FT_LOAD_DEFAULT;
    for (i = 0; i < count; i++) {
        ch = text[i];
        (*glyph_info)[i].index = FT_Get_Char_Index(self->face, ch);
        error = FT_Load_Glyph(self->face, (*glyph_info)[i].index, load_flags);
        if (error) return -1;
        glyph = self->face->glyph;
        (*glyph_info)[i].x_offset = 0;
        (*glyph_info)[i].y_offset = 0;
        if (kerning && last_index && (*glyph_info)[i].index) {
            FT_Vector delta;
            if (FT_Get_Kerning(self->face, last_index, (*glyph_info)[i].index, ft_kerning_default, &delta) == 0) {
                (*glyph_info)[i - 1].x_advance += PIXEL(delta.x);
                (*glyph_info)[i - 1].y_advance += PIXEL(delta.y);
            }
        }
        (*glyph_info)[i].x_advance = glyph->metrics.horiAdvance;
        (*glyph_info)[i].y_advance = 0;
        last_index = (*glyph_info)[i].index;
        (*glyph_info)[i].cluster = ch;
    }
    return count;
}

/* FreeTypeFont.getlength(text) * 64 */
EXPORT int font_getlength(Font *self, const unsigned int *text, int n) {
    GlyphInfo *glyph_info = NULL;
    int i, count, length = 0;
    count = text_layout(self, text, n, &glyph_info);
    if (count < 0) { free(glyph_info); return INT_MIN; }
    for (i = 0; i < count; i++) length += glyph_info[i].x_advance;
    free(glyph_info);
    return length;
}

/* _imagingft.c bounding_box_and_anchors, horizontal text only */
static int bounding_box_and_anchors(FT_Face face, const char *anchor, GlyphInfo *glyph_info, size_t count, int load_flags,
                                    int64_t *width, int64_t *height, int *x_offset, int *y_offset) {
    long position, advanced;
    int px, py;
    int x_min, x_max, y_min, y_max;
    int x_anchor, y_anchor;
    int error;
    FT_Glyph glyph;
    FT_BBox bbox;
    size_t i;
    position = x_min = x_max = y_min = y_max = 0;
    for (i = 0; i < count; i++) {
        px = PIXEL(position + glyph_info[i].x_offset);
        py = PIXEL(glyph_info[i].y_offset);
        position += glyph_info[i].x_advance;
        advanced = PIXEL(position);
        if (advanced > x_max) x_max = advanced;
        error = FT_Load_Glyph(face, glyph_info[i].index, load_flags);
        if (error) return 1;
        error = FT_Get_Glyph(face->glyph, &glyph);
        if (error) return 1;
        FT_Glyph_Get_CBox(glyph, FT_GLYPH_BBOX_PIXELS, &bbox);
        bbox.xMax += px;
        if (bbox.xMax > x_max) x_max = bbox.xMax;
        bbox.xMin += px;
        if (bbox.xMin < x_min) x_min = bbox.xMin;
        bbox.yMax += py;
        if (bbox.yMax > y_max) y_max = bbox.yMax;
        bbox.yMin += py;
        if (bbox.yMin < y_min) y_min = bbox.yMin;
        FT_Done_Glyph(glyph);
    }
    if (anchor == NULL) anchor = "la";
    x_anchor = y_anchor = 0;
    if (count) {
        switch (anchor[0]) {
            case 'l': x_anchor = 0; break;
            case 'm': x_anchor = PIXEL(position / 2); break;
            case 'r': x_anchor = PIXEL(position); break;
            default: return 1;
        }
        switch (anchor[1]) {
            case 'a': y_anchor = PIXEL(face->size->metrics.ascender); break;
            case 't': y_anchor = y_max; break;
            case 'm': y_anchor = PIXEL((face->size->metrics.ascender + face->size->metrics.descender) / 2); break;
            case 's': y_anchor = 0; break;
            case 'b': y_anchor = y_min; break;
            case 'd': y_anchor = PIXEL(face->size->metrics.descender); break;
            default: return 1;
        }
    }
    *width = (int64_t)x_max - x_min;
    *height = (int64_t)y_max - y_min;
    *x_offset = -x_anchor + x_min;
    *y_offset = -(-y_anchor + y_max);
    return 0;
}

static char anchor_buf[3];
static const char *anchor_of(int a) {
    if (!a) return NULL;
    anchor_buf[0] = (char)(a & 255);
    anchor_buf[1] = (char)((a >> 8) & 255);
    anchor_buf[2] = 0;
    return anchor_buf;
}

/* font.getsize(text, anchor) -> out[0..3] = width, height, x_offset, y_offset */
EXPORT int font_getsize(Font *self, const unsigned int *text, int n, int anchor, int *out) {
    int64_t width, height;
    int x_offset, y_offset, error, count;
    GlyphInfo *glyph_info = NULL;
    count = text_layout(self, text, n, &glyph_info);
    if (count < 0) { free(glyph_info); return 1; }
    error = bounding_box_and_anchors(self->face, anchor_of(anchor), glyph_info, count, FT_LOAD_DEFAULT,
                                     &width, &height, &x_offset, &y_offset);
    free(glyph_info);
    if (error) return 1;
    out[0] = (int)width; out[1] = (int)height; out[2] = x_offset; out[3] = y_offset;
    return 0;
}

/* font.render(text, fill, "L", None, None, None, stroke_width, stroke_filled, anchor, 0, start)
   -> an L image; out[0..1] = offset */
EXPORT Imaging font_render(Font *self, const unsigned int *text, int n, float stroke_width, int stroke_filled,
                           int anchor_code, float x_start, float y_start, int *out) {
    int x, y, px, py, x_min, y_max, load_flags, error;
    FT_Glyph glyph = NULL;
    FT_GlyphSlot glyph_slot;
    FT_Bitmap bitmap;
    FT_Bitmap bitmap_converted;
    FT_BitmapGlyph bitmap_glyph;
    FT_Stroker stroker = NULL;
    int bitmap_converted_ready = 0;
    GlyphInfo *glyph_info = NULL;
    size_t i, count;
    int xx, yy, x0, x1;
    unsigned int bitmap_y;
    unsigned char *source;
    unsigned char convert_scale;
    Imaging im;
    int64_t width, height;
    int x_offset, y_offset;
    int c;
    const char *anchor = anchor_of(anchor_code);

    c = text_layout(self, text, n, &glyph_info);
    if (c < 0) { free(glyph_info); return NULL; }
    count = (size_t)c;

    load_flags = stroke_width ? FT_LOAD_NO_BITMAP : FT_LOAD_DEFAULT;

    error = bounding_box_and_anchors(self->face, anchor, glyph_info, count, load_flags, &width, &height, &x_offset, &y_offset);
    if (error) { free(glyph_info); return NULL; }

    width += ceil(stroke_width * 2 + x_start);
    height += ceil(stroke_width * 2 + y_start);
    im = ImagingNew(IMAGING_MODE_L, (int)width, (int)height);
    if (!im) { free(glyph_info); return NULL; }

    x_offset = round(x_offset - stroke_width);
    y_offset = round(y_offset - stroke_width);
    out[0] = x_offset;
    out[1] = y_offset;
    if (count == 0 || width == 0 || height == 0) { free(glyph_info); return im; }

    if (stroke_width) {
        error = FT_Stroker_New(library, &stroker);
        if (error) goto glyph_error;
        FT_Stroker_Set(stroker, (FT_Fixed)round(stroke_width * 64), FT_STROKER_LINECAP_ROUND, FT_STROKER_LINEJOIN_ROUND, 0);
    }

    x = y = x_min = y_max = 0;
    for (i = 0; i < count; i++) {
        px = PIXEL(x + glyph_info[i].x_offset);
        py = PIXEL(y + glyph_info[i].y_offset);
        error = FT_Load_Glyph(self->face, glyph_info[i].index, load_flags | FT_LOAD_RENDER);
        if (error) goto glyph_error;
        glyph_slot = self->face->glyph;
        bitmap = glyph_slot->bitmap;
        if (glyph_slot->bitmap_top + py > y_max) y_max = glyph_slot->bitmap_top + py;
        if (glyph_slot->bitmap_left + px < x_min) x_min = glyph_slot->bitmap_left + px;
        x += glyph_info[i].x_advance;
        y += glyph_info[i].y_advance;
    }

    x = round((-x_min + stroke_width + x_start) * 64);
    y = round((-y_max + (-stroke_width) - y_start) * 64);

    if (stroker == NULL) load_flags |= FT_LOAD_RENDER;

    for (i = 0; i < count; i++) {
        px = PIXEL(x + glyph_info[i].x_offset);
        py = PIXEL(y + glyph_info[i].y_offset);
        error = FT_Load_Glyph(self->face, glyph_info[i].index, load_flags);
        if (error) goto glyph_error;
        glyph_slot = self->face->glyph;
        if (stroker != NULL) {
            error = FT_Get_Glyph(glyph_slot, &glyph);
            if (!error) error = stroke_filled ? FT_Glyph_StrokeBorder(&glyph, stroker, 0, 1) : FT_Glyph_Stroke(&glyph, stroker, 1);
            if (!error) {
                FT_Vector origin = {0, 0};
                error = FT_Glyph_To_Bitmap(&glyph, FT_RENDER_MODE_NORMAL, &origin, 1);
            }
            if (error) goto glyph_error;
            bitmap_glyph = (FT_BitmapGlyph)glyph;
            bitmap = bitmap_glyph->bitmap;
            xx = px + bitmap_glyph->left;
            yy = -(py + bitmap_glyph->top);
        } else {
            bitmap = glyph_slot->bitmap;
            xx = px + glyph_slot->bitmap_left;
            yy = -(py + glyph_slot->bitmap_top);
        }
        if (bitmap.buffer) {
            switch (bitmap.pixel_mode) {
                case FT_PIXEL_MODE_MONO: convert_scale = 255; break;
                case FT_PIXEL_MODE_GRAY2: convert_scale = 255 / 3; break;
                case FT_PIXEL_MODE_GRAY4: convert_scale = 255 / 15; break;
                default: convert_scale = 1;
            }
            switch (bitmap.pixel_mode) {
                case FT_PIXEL_MODE_MONO:
                case FT_PIXEL_MODE_GRAY2:
                case FT_PIXEL_MODE_GRAY4:
                    if (!bitmap_converted_ready) { FT_Bitmap_Init(&bitmap_converted); bitmap_converted_ready = 1; }
                    error = FT_Bitmap_Convert(library, &bitmap, &bitmap_converted, 1);
                    if (error) goto glyph_error;
                    bitmap = bitmap_converted;
                case FT_PIXEL_MODE_GRAY:
                    break;
                default:
                    goto glyph_error;
            }
            x0 = 0;
            x1 = bitmap.width;
            if (xx < 0) x0 = -xx;
            if (xx + x1 > im->xsize) x1 = im->xsize - xx;
            source = (unsigned char *)bitmap.buffer;
            for (bitmap_y = 0; bitmap_y < bitmap.rows; bitmap_y++, yy++) {
                if (yy >= 0 && yy < im->ysize) {
                    int k;
                    unsigned char *target = im->image8[yy] + xx;
                    unsigned int tmp;
                    for (k = x0; k < x1; k++) {
                        unsigned int src_alpha = source[k] * convert_scale;
                        if (src_alpha > 0) {
                            target[k] = target[k] > 0 ? CLIP8(src_alpha + MULDIV255(target[k], (255 - src_alpha), tmp)) : src_alpha;
                        }
                    }
                }
                source += bitmap.pitch;
            }
        }
        x += glyph_info[i].x_advance;
        y += glyph_info[i].y_advance;
        if (stroker != NULL) { FT_Done_Glyph(glyph); glyph = NULL; }
    }
    if (bitmap_converted_ready) FT_Bitmap_Done(library, &bitmap_converted);
    FT_Stroker_Done(stroker);
    free(glyph_info);
    return im;

glyph_error:
    ImagingDelete(im);
    if (stroker != NULL && glyph) FT_Done_Glyph(glyph);
    if (bitmap_converted_ready) FT_Bitmap_Done(library, &bitmap_converted);
    FT_Stroker_Done(stroker);
    free(glyph_info);
    return NULL;
}
