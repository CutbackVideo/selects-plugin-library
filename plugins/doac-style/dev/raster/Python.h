/* Minimal stand-in so Pillow's libImaging compiles without CPython. */
#ifndef DOAC_FAKE_PYTHON_H
#define DOAC_FAKE_PYTHON_H
#include <stdint.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>
#include <math.h>
#define HAVE_PROTOTYPES 1
#define STDC_HEADERS 1
typedef long Py_ssize_t;
typedef struct _object PyObject;
#define Py_DECREF(x) ((void)0)
#define Py_INCREF(x) ((void)0)
#define PyErr_Clear() ((void)0)
#endif
