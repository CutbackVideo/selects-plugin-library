// @name Beat Cutout Gallery
// @name:de Beat-Cutout-Galerie
// @name:en Beat Cutout Gallery
// @name:es Galeria de recortes al ritmo
// @name:fr Galerie decoupee au rythme
// @name:it Galleria cutout a ritmo
// @name:ja ビートカットアウトギャラリー
// @name:ko Beat Cutout Gallery
// @name:pt Galeria de recortes no ritmo
// @name:tr Ritimli Kesit Galerisi
// @name:zh 节拍抠像画廊
// @icon image
// Checks project portraits, then creates an editable beat-synced Selects Draft.
import React from 'react';

const WORDS = {
  en: { title:'Beat Cutout Gallery', intro:'Your portrait photos are checked for clean cutouts, then cut to the beat as an editable Draft.', folder:'Photo folder', all:'All project photos', refresh:'Refresh photos', analyze:'Analyze photos', build:'Make video', busy:'Checking photos…', noProject:'Open a Selects project first.', noPhotos:'Add at least 15 portrait photos to the project.', done:'Created an editable Draft. Photos, stickers, and music remain separate timeline clips.', exactDone:'Created an editable Draft with 24 scenes, four entrance stickers, and a separate music track. Later composites remain inside their scene clips.', missing:'Add more photos.', error:'Could not create video: ', export:'Export with Handoff → Export after review.', selected:'Selected photos', fixed:'Review the photos and leave only the ones you want to use. Scene and sticker slots are assigned after analysis.', macOnly:'Available on macOS for now.', credits:'On Windows, people are cut out by Selects generation, which uses Selects credits: {n} photos go up as one {s}-second clip. Nothing is sent until you press the button below.', send:'Send {n} photos and use credits', cancel:'Cancel', newer:'Person cutouts on Windows need a newer Selects (2.0.512 or later). Update Selects, then try again.', noGeneration:'Person cutouts on Windows use Selects generation, which this account cannot use yet.', noCredits:'Not enough Selects credits to cut out the people.', framing:'Checking photos… {k}/{n}', uploading:'Sending the photos for person cutouts…', cloudWait:'Cutting out people with Selects generation · {s} s', masking:'Checking the cutouts…', making:'Making the stickers and scene clips…' },
  de: { title:'Beat-Cutout-Galerie', intro:'Deine Hochformat-Fotos werden auf saubere Freisteller geprüft und dann beatgenau zu einem bearbeitbaren Draft geschnitten.', folder:'Fotoordner', all:'Alle Projektfotos', refresh:'Fotos neu laden', analyze:'Fotos analysieren', build:'Video erstellen', busy:'Fotos werden geprüft…', noProject:'Öffne zuerst ein Selects-Projekt.', noPhotos:'Füge dem Projekt mindestens 15 Hochformat-Fotos hinzu.', done:'Bearbeitbarer Draft erstellt. Fotos, Sticker und Musik bleiben getrennte Timeline-Clips.', exactDone:'Bearbeitbarer Draft mit 24 Szenen, vier Eingangs-Stickern und einer separaten Musikspur erstellt. Spätere Composites bleiben in ihren Szenen-Clips.', missing:'Füge weitere Fotos hinzu.', error:'Video konnte nicht erstellt werden: ', export:'Nach der Prüfung mit Handoff → Export ausgeben.', selected:'Ausgewählte Fotos', fixed:'Sieh die Fotos durch und behalte nur die, die du verwenden willst. Szenen- und Sticker-Plätze werden nach der Analyse vergeben.', macOnly:'Vorerst nur auf macOS verfügbar.', credits:'Unter Windows werden Personen mit der Selects-Generierung freigestellt; das verbraucht Selects-Credits: {n} Fotos werden als ein {s}-Sekunden-Clip hochgeladen. Erst die Schaltfläche unten sendet etwas.', send:'{n} Fotos senden und Credits verwenden', cancel:'Abbrechen', newer:'Freisteller unter Windows brauchen eine neuere Selects-Version (2.0.512 oder neuer). Aktualisiere Selects und versuche es erneut.', noGeneration:'Freisteller unter Windows nutzen die Selects-Generierung, die dieses Konto noch nicht verwenden kann.', noCredits:'Nicht genug Selects-Credits, um die Personen freizustellen.', framing:'Fotos werden geprüft… {k}/{n}', uploading:'Fotos werden für die Freisteller gesendet…', cloudWait:'Personen werden mit der Selects-Generierung freigestellt · {s} s', masking:'Freisteller werden geprüft…', making:'Sticker und Szenenclips werden erstellt…' },
  es: { title:'Galería de recortes al ritmo', intro:'Tus fotos verticales se comprueban para obtener recortes limpios y luego se cortan al ritmo en un Draft editable.', folder:'Carpeta de fotos', all:'Todas las fotos del proyecto', refresh:'Actualizar fotos', analyze:'Analizar fotos', build:'Crear vídeo', busy:'Comprobando fotos…', noProject:'Abre primero un proyecto de Selects.', noPhotos:'Añade al menos 15 fotos verticales al proyecto.', done:'Draft editable creado. Las fotos, los recortes y la música siguen siendo clips independientes.', exactDone:'Draft editable creado con 24 escenas, cuatro recortes de entrada y una pista de música aparte. Los composites posteriores quedan dentro de sus clips de escena.', missing:'Añade más fotos.', error:'No se pudo crear el vídeo: ', export:'Exporta con Handoff → Export después de revisar.', selected:'Fotos seleccionadas', fixed:'Revisa las fotos y deja solo las que quieras usar. Los huecos de escena y recorte se asignan tras el análisis.', macOnly:'Disponible solo en macOS por ahora.', credits:'En Windows, las personas se recortan con la generación de Selects, que usa créditos de Selects: {n} fotos se envían como un clip de {s} segundos. No se envía nada hasta que pulses el botón de abajo.', send:'Enviar {n} fotos y usar créditos', cancel:'Cancelar', newer:'Los recortes de personas en Windows necesitan una versión más reciente de Selects (2.0.512 o posterior). Actualiza Selects y vuelve a intentarlo.', noGeneration:'Los recortes de personas en Windows usan la generación de Selects, que esta cuenta todavía no puede usar.', noCredits:'No hay suficientes créditos de Selects para recortar a las personas.', framing:'Comprobando fotos… {k}/{n}', uploading:'Enviando las fotos para recortar a las personas…', cloudWait:'Recortando personas con la generación de Selects · {s} s', masking:'Comprobando los recortes…', making:'Creando los recortes y los clips de escena…' },
  fr: { title:'Galerie découpée au rythme', intro:'Vos photos verticales sont vérifiées pour des découpes nettes, puis montées sur le rythme dans un Draft modifiable.', folder:'Dossier de photos', all:'Toutes les photos du projet', refresh:'Actualiser les photos', analyze:'Analyser les photos', build:'Créer la vidéo', busy:'Vérification des photos…', noProject:'Ouvrez d’abord un projet Selects.', noPhotos:'Ajoutez au moins 15 photos verticales au projet.', done:'Draft modifiable créé. Photos, découpes et musique restent des clips distincts.', exactDone:'Draft modifiable créé avec 24 scènes, quatre découpes d’entrée et une piste musicale séparée. Les composites suivants restent dans leurs clips de scène.', missing:'Ajoutez d’autres photos.', error:'Impossible de créer la vidéo : ', export:'Exportez avec Handoff → Export après relecture.', selected:'Photos sélectionnées', fixed:'Passez les photos en revue et ne gardez que celles à utiliser. Les emplacements de scène et de découpe sont attribués après l’analyse.', macOnly:'Disponible sur macOS pour le moment.', credits:'Sous Windows, les personnes sont détourées par la génération Selects, qui utilise des crédits Selects : {n} photos sont envoyées sous forme d’un clip de {s} secondes. Rien n’est envoyé avant que vous appuyiez sur le bouton ci-dessous.', send:'Envoyer {n} photos et utiliser des crédits', cancel:'Annuler', newer:'Le détourage sous Windows demande une version plus récente de Selects (2.0.512 ou ultérieure). Mettez Selects à jour, puis réessayez.', noGeneration:'Le détourage sous Windows utilise la génération Selects, que ce compte ne peut pas encore utiliser.', noCredits:'Pas assez de crédits Selects pour détourer les personnes.', framing:'Vérification des photos… {k}/{n}', uploading:'Envoi des photos pour le détourage…', cloudWait:'Détourage des personnes par la génération Selects · {s} s', masking:'Vérification des détourages…', making:'Création des découpes et des clips de scène…' },
  it: { title:'Galleria cutout a ritmo', intro:'Le tue foto verticali vengono controllate per ottenere scontorni puliti, poi tagliate a ritmo in un Draft modificabile.', folder:'Cartella foto', all:'Tutte le foto del progetto', refresh:'Aggiorna foto', analyze:'Analizza foto', build:'Crea video', busy:'Controllo delle foto…', noProject:'Apri prima un progetto Selects.', noPhotos:'Aggiungi al progetto almeno 15 foto verticali.', done:'Draft modificabile creato. Foto, scontorni e musica restano clip separate.', exactDone:'Draft modificabile creato con 24 scene, quattro scontorni d’ingresso e una traccia musicale separata. I composite successivi restano nelle loro clip di scena.', missing:'Aggiungi altre foto.', error:'Impossibile creare il video: ', export:'Esporta con Handoff → Export dopo la revisione.', selected:'Foto selezionate', fixed:'Controlla le foto e lascia solo quelle da usare. Gli slot di scena e scontorno vengono assegnati dopo l’analisi.', macOnly:'Per ora disponibile solo su macOS.', credits:'Su Windows le persone vengono scontornate dalla generazione di Selects, che usa crediti Selects: {n} foto vengono inviate come un clip di {s} secondi. Non viene inviato nulla finché non premi il pulsante qui sotto.', send:'Invia {n} foto e usa crediti', cancel:'Annulla', newer:'Gli scontorni su Windows richiedono una versione più recente di Selects (2.0.512 o successiva). Aggiorna Selects e riprova.', noGeneration:'Gli scontorni su Windows usano la generazione di Selects, che questo account non può ancora usare.', noCredits:'Crediti Selects insufficienti per scontornare le persone.', framing:'Controllo delle foto… {k}/{n}', uploading:'Invio delle foto per lo scontorno…', cloudWait:'Scontorno delle persone con la generazione di Selects · {s} s', masking:'Controllo degli scontorni…', making:'Creazione degli scontorni e delle clip di scena…' },
  ja: { title:'ビートカットアウトギャラリー', intro:'縦向きの写真をきれいに切り抜けるか確認し、ビートに合わせて編集できるDraftに仕上げます。', folder:'写真フォルダー', all:'プロジェクトのすべての写真', refresh:'写真を再読み込み', analyze:'写真を解析', build:'動画を作成', busy:'写真を確認中…', noProject:'先にSelectsのプロジェクトを開いてください。', noPhotos:'縦向きの写真を15枚以上プロジェクトに追加してください。', done:'編集できるDraftを作成しました。写真、ステッカー、音楽はそれぞれ別のクリップのままです。', exactDone:'24シーン、4つの登場ステッカー、独立した音楽トラックを持つ編集できるDraftを作成しました。以降の合成は各シーンのクリップ内に残ります。', missing:'写真を追加してください。', error:'動画を作成できませんでした: ', export:'確認後、Handoff → Export で書き出してください。', selected:'選択した写真', fixed:'写真を見直して、使うものだけを残してください。シーンとステッカーの枠は解析後に割り当てられます。', macOnly:'現在はmacOSでのみ利用できます。', credits:'Windowsでは人物の切り抜きにSelectsの生成機能を使い、Selectsクレジットを消費します。写真{n}枚を{s}秒のクリップ1本として送信します。下のボタンを押すまで何も送信されません。', send:'写真{n}枚を送信してクレジットを使う', cancel:'キャンセル', newer:'Windowsでの人物の切り抜きには新しいSelects（2.0.512以降）が必要です。Selectsを更新してからもう一度お試しください。', noGeneration:'Windowsでの人物の切り抜きはSelectsの生成機能を使いますが、このアカウントではまだ使えません。', noCredits:'人物を切り抜くためのSelectsクレジットが足りません。', framing:'写真を確認中… {k}/{n}', uploading:'人物の切り抜き用に写真を送信中…', cloudWait:'Selectsの生成機能で人物を切り抜き中 · {s}秒', masking:'切り抜きを確認中…', making:'ステッカーとシーンクリップを作成中…' },
  ko: { title:'\ube44\ud2b8 \ucef7\uc544\uc6c3 \uac24\ub7ec\ub9ac', intro:'\uc138\ub85c \uc0ac\uc9c4\uc774 \uae68\ub057\ud558\uac8c \ub204\ub07c\uac00 \ub530\uc9c0\ub294\uc9c0 \ud655\uc778\ud55c \ub4a4, \ube44\ud2b8\uc5d0 \ub9de\ucdb0 \uc218\uc815 \uac00\ub2a5\ud55c Draft\ub85c \ub9cc\ub4ed\ub2c8\ub2e4.', folder:'\uc0ac\uc9c4 \ud3f4\ub354', all:'\ud504\ub85c\uc81d\ud2b8\uc758 \ubaa8\ub4e0 \uc0ac\uc9c4', refresh:'\uc0ac\uc9c4 \uc0c8\ub85c \uc77d\uae30', analyze:'\uc0ac\uc9c4 \ubd84\uc11d', build:'\uc601\uc0c1 \ub9cc\ub4e4\uae30', busy:'\uc0ac\uc9c4 \ud655\uc778 \uc911…', noProject:'\uba3c\uc800 Selects \ud504\ub85c\uc81d\ud2b8\ub97c \uc5f4\uc5b4\uc8fc\uc138\uc694.', noPhotos:'\uc138\ub85c \uc0ac\uc9c4\uc744 15\uc7a5 \uc774\uc0c1 \ud504\ub85c\uc81d\ud2b8\uc5d0 \ucd94\uac00\ud558\uc138\uc694.', done:'\uc218\uc815 \uac00\ub2a5\ud55c Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \uc0ac\uc9c4, \uc2a4\ud2f0\ucee4, \uc74c\uc545\uc740 \uac01\uac01 \ubcc4\ub3c4\uc758 \ud074\ub9bd\uc73c\ub85c \ub0a8\uc2b5\ub2c8\ub2e4.', exactDone:'24\uac1c \uc7a5\uba74, \ub4f1\uc7a5 \uc2a4\ud2f0\ucee4 4\uac1c, \ubcc4\ub3c4 \uc74c\uc545 \ud2b8\ub799\uc774 \uc788\ub294 \uc218\uc815 \uac00\ub2a5\ud55c Draft\ub97c \ub9cc\ub4e4\uc5c8\uc2b5\ub2c8\ub2e4. \uc774\ud6c4 \ud569\uc131\uc740 \uac01 \uc7a5\uba74 \ud074\ub9bd \uc548\uc5d0 \ub0a8\uc2b5\ub2c8\ub2e4.', missing:'\uc0ac\uc9c4\uc744 \ub354 \ucd94\uac00\ud558\uc138\uc694.', error:'\uc601\uc0c1\uc744 \ub9cc\ub4e4 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4: ', export:'\uac80\ud1a0 \ud6c4 Handoff → Export\ub85c \ub0b4\ubcf4\ub0b4\uc138\uc694.', selected:'\uc120\ud0dd\ud55c \uc0ac\uc9c4', fixed:'\uc0ac\uc9c4\uc744 \ud655\uc778\ud558\uace0 \uc0ac\uc6a9\ud560 \uac83\ub9cc \ub0a8\uae30\uc138\uc694. \uc7a5\uba74\uacfc \uc2a4\ud2f0\ucee4 \uc790\ub9ac\ub294 \ubd84\uc11d \ud6c4\uc5d0 \ubc30\uc815\ub429\ub2c8\ub2e4.', macOnly:'\uc9c0\uae08\uc740 macOS\uc5d0\uc11c\ub9cc \uc0ac\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.', credits:'Windows\uc5d0\uc11c\ub294 Selects \uc0dd\uc131 \uae30\ub2a5\uc73c\ub85c \uc778\ubb3c \ub204\ub07c\ub97c \ub530\uba70 Selects \ud06c\ub808\ub527\uc774 \uc0ac\uc6a9\ub429\ub2c8\ub2e4. \uc0ac\uc9c4 {n}\uc7a5\uc744 {s}\ucd08 \uae38\uc774\uc758 \ud074\ub9bd \ud558\ub098\ub85c \ubcf4\ub0c5\ub2c8\ub2e4. \uc544\ub798 \ubc84\ud2bc\uc744 \ub204\ub974\uae30 \uc804\uc5d0\ub294 \uc544\ubb34\uac83\ub3c4 \ubcf4\ub0b4\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.', send:'\uc0ac\uc9c4 {n}\uc7a5 \ubcf4\ub0b4\uace0 \ud06c\ub808\ub527 \uc0ac\uc6a9', cancel:'\ucde8\uc18c', newer:'Windows\uc5d0\uc11c \uc778\ubb3c \ub204\ub07c\ub97c \ub530\ub824\uba74 \ucd5c\uc2e0 Selects(2.0.512 \uc774\uc0c1)\uac00 \ud544\uc694\ud569\ub2c8\ub2e4. Selects\ub97c \uc5c5\ub370\uc774\ud2b8\ud55c \ub4a4 \ub2e4\uc2dc \uc2dc\ub3c4\ud558\uc138\uc694.', noGeneration:'Windows\uc758 \uc778\ubb3c \ub204\ub07c\ub294 Selects \uc0dd\uc131 \uae30\ub2a5\uc744 \uc4f0\ub294\ub370, \uc774 \uacc4\uc815\uc740 \uc544\uc9c1 \uc0ac\uc6a9\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.', noCredits:'\uc778\ubb3c \ub204\ub07c\ub97c \ub538 Selects \ud06c\ub808\ub527\uc774 \ubd80\uc871\ud569\ub2c8\ub2e4.', framing:'\uc0ac\uc9c4 \ud655\uc778 \uc911… {k}/{n}', uploading:'\uc778\ubb3c \ub204\ub07c\uc6a9 \uc0ac\uc9c4\uc744 \ubcf4\ub0b4\ub294 \uc911…', cloudWait:'Selects \uc0dd\uc131 \uae30\ub2a5\uc73c\ub85c \uc778\ubb3c \ub204\ub07c\ub97c \ub530\ub294 \uc911 · {s}\ucd08', masking:'\ub204\ub07c \ud655\uc778 \uc911…', making:'\uc2a4\ud2f0\ucee4\uc640 \uc7a5\uba74 \ud074\ub9bd\uc744 \ub9cc\ub4dc\ub294 \uc911…' },
  pt: { title:'Galeria de recortes no ritmo', intro:'Suas fotos na vertical são verificadas para recortes limpos e depois cortadas no ritmo em um Draft editável.', folder:'Pasta de fotos', all:'Todas as fotos do projeto', refresh:'Atualizar fotos', analyze:'Analisar fotos', build:'Criar vídeo', busy:'Verificando fotos…', noProject:'Abra primeiro um projeto do Selects.', noPhotos:'Adicione ao projeto pelo menos 15 fotos na vertical.', done:'Draft editável criado. Fotos, recortes e música continuam clipes separados.', exactDone:'Draft editável criado com 24 cenas, quatro recortes de entrada e uma faixa de música separada. Os composites seguintes ficam dentro dos clipes de cena.', missing:'Adicione mais fotos.', error:'Não foi possível criar o vídeo: ', export:'Exporte com Handoff → Export após revisar.', selected:'Fotos selecionadas', fixed:'Revise as fotos e deixe apenas as que quiser usar. Os espaços de cena e recorte são atribuídos após a análise.', macOnly:'Disponível no macOS por enquanto.', credits:'No Windows, as pessoas são recortadas pela geração do Selects, que usa créditos do Selects: {n} fotos são enviadas como um clipe de {s} segundos. Nada é enviado até você tocar no botão abaixo.', send:'Enviar {n} fotos e usar créditos', cancel:'Cancelar', newer:'Os recortes no Windows precisam de uma versão mais recente do Selects (2.0.512 ou posterior). Atualize o Selects e tente novamente.', noGeneration:'Os recortes no Windows usam a geração do Selects, que esta conta ainda não pode usar.', noCredits:'Créditos do Selects insuficientes para recortar as pessoas.', framing:'Verificando fotos… {k}/{n}', uploading:'Enviando as fotos para recorte…', cloudWait:'Recortando pessoas com a geração do Selects · {s} s', masking:'Verificando os recortes…', making:'Criando os recortes e os clipes de cena…' },
  tr: { title:'Ritimli Kesit Galerisi', intro:'Dikey fotoğraflarınız temiz kesim için denetlenir, ardından ritme göre düzenlenebilir bir Draft olarak kesilir.', folder:'Fotoğraf klasörü', all:'Projedeki tüm fotoğraflar', refresh:'Fotoğrafları yenile', analyze:'Fotoğrafları incele', build:'Video oluştur', busy:'Fotoğraflar denetleniyor…', noProject:'Önce bir Selects projesi açın.', noPhotos:'Projeye en az 15 dikey fotoğraf ekleyin.', done:'Düzenlenebilir Draft oluşturuldu. Fotoğraflar, kesitler ve müzik ayrı klipler olarak kalır.', exactDone:'24 sahne, dört giriş kesiti ve ayrı bir müzik parçası olan düzenlenebilir bir Draft oluşturuldu. Sonraki birleşimler kendi sahne kliplerinde kalır.', missing:'Daha fazla fotoğraf ekleyin.', error:'Video oluşturulamadı: ', export:'İnceledikten sonra Handoff → Export ile dışa aktarın.', selected:'Seçilen fotoğraflar', fixed:'Fotoğrafları gözden geçirip yalnızca kullanmak istediklerinizi bırakın. Sahne ve kesit yerleri incelemeden sonra atanır.', macOnly:'Şimdilik yalnızca macOS’ta kullanılabilir.', credits:'Windows’ta kişiler Selects üretimiyle kesilir ve bu Selects kredisi kullanır: {n} fotoğraf {s} saniyelik tek bir klip olarak gönderilir. Aşağıdaki düğmeye basana kadar hiçbir şey gönderilmez.', send:'{n} fotoğrafı gönder ve kredi kullan', cancel:'İptal', newer:'Windows’ta kişi kesimi için daha yeni bir Selects (2.0.512 veya üstü) gerekir. Selects’i güncelleyip yeniden deneyin.', noGeneration:'Windows’ta kişi kesimi Selects üretimini kullanır; bu hesap bunu henüz kullanamıyor.', noCredits:'Kişileri kesmek için yeterli Selects kredisi yok.', framing:'Fotoğraflar denetleniyor… {k}/{n}', uploading:'Fotoğraflar kişi kesimi için gönderiliyor…', cloudWait:'Kişiler Selects üretimiyle kesiliyor · {s} sn', masking:'Kesitler denetleniyor…', making:'Kesitler ve sahne klipleri oluşturuluyor…' },
  zh: { title:'节拍抠像画廊', intro:'先检查竖版照片能否干净抠出人物，再按节拍剪成一个可编辑的 Draft。', folder:'照片文件夹', all:'项目中的全部照片', refresh:'重新载入照片', analyze:'分析照片', build:'生成视频', busy:'正在检查照片…', noProject:'请先打开一个 Selects 项目。', noPhotos:'请向项目中添加至少 15 张竖版照片。', done:'已创建可编辑的 Draft。照片、贴纸和音乐仍是各自独立的时间线片段。', exactDone:'已创建包含 24 个场景、四个入场贴纸和一条独立音乐轨的可编辑 Draft。后续合成保留在各自的场景片段内。', missing:'请添加更多照片。', error:'无法生成视频：', export:'审看后用 Handoff → Export 导出。', selected:'已选照片', fixed:'请检查照片，只保留想用的。场景与贴纸的位置在分析后分配。', macOnly:'目前仅在 macOS 上可用。', credits:'在 Windows 上，人物抠像由 Selects 生成功能完成，会消耗 Selects 积分：{n} 张照片将作为一段 {s} 秒的片段上传。在你按下面的按钮之前不会发送任何内容。', send:'发送 {n} 张照片并使用积分', cancel:'取消', newer:'在 Windows 上抠像需要更新版本的 Selects（2.0.512 或更高）。请更新 Selects 后重试。', noGeneration:'在 Windows 上抠像使用 Selects 生成功能，此账户暂时无法使用。', noCredits:'Selects 积分不足，无法抠出人物。', framing:'正在检查照片… {k}/{n}', uploading:'正在上传照片以抠出人物…', cloudWait:'正在用 Selects 生成功能抠出人物 · {s} 秒', masking:'正在检查抠像…', making:'正在制作贴纸和场景片段…' },
};
const CUES=[
  {start:29,end:40,dir:'up',x:0,y:0,s:1},
  {start:61,end:72,dir:'right',x:0,y:0,s:1},
  {start:93,end:104,dir:'left',x:0,y:0,s:1},
  {start:132,end:140,dir:'down',x:0,y:0,s:1},
  {start:156,end:196,dir:'instant',x:210,y:-205,s:.62},
  {start:166,end:196,dir:'instant',x:-200,y:-120,s:.69},
  {start:180,end:196,dir:'instant',x:80,y:270,s:.76},
  {start:267,end:283,dir:'right',x:-110,y:260,s:.62},
  {start:324,end:337,dir:'left',x:105,y:285,s:.68},
  {start:401,end:411,dir:'down',x:-80,y:250,s:.68},
  {start:436,end:478,dir:'up',x:30,y:290,s:.78},
  {start:457,end:478,dir:'instant',x:0,y:0,s:1}
];
const SCENE_EDGES=[0,40,72,104,140,196,220,235,243,283,307,337,347,371,411,478];
const MOTION = "import React from 'react';import{AbsoluteFill,useCurrentFrame}from'remotion';export default function Sticker({Source,data}){const f=useCurrentFrame();const d=data.dir||'instant';const u=Math.max(0,Math.min(1,f/6));const e=u*u*(3-2*u);const travel=(1-e);const dx=d==='right'?-1250*travel:d==='left'?1250*travel:0;const dy=d==='up'?2100*travel:d==='down'?-2100*travel:0;const x=(data.x||0)+(d==='fade'?0:dx),y=(data.y||0)+(d==='fade'?0:dy);return <AbsoluteFill style={{opacity:d==='fade'?e:1,transform:'translate('+x+'px,'+y+'px) scale('+(data.s||1)+')'}}><Source/></AbsoluteFill>}";
// Reference 211-219: the scene darkens to teal while a circle around the faces stays lit and grows, then a dark red wash before the cut.
const SPOT = "import React from 'react';import{AbsoluteFill,useCurrentFrame}from'remotion';export default function Spot({Source,data}){const t=useCurrentFrame()-(data.at||0);let o=null;if(t>=0&&t<6){const r=70+75*t;o=<AbsoluteFill style={{background:'radial-gradient(circle at '+(data.x*100)+'% '+(data.y*100)+'%, rgba(0,0,0,0) '+r+'px, rgba(8,40,44,0.64) '+(r+3)+'px)'}}/>}else if(t>=6&&t<9){o=<AbsoluteFill style={{background:'rgba(112,18,30,0.4)'}}/>}return <AbsoluteFill><Source/>{o}</AbsoluteFill>}";
// Reference 438-441: a short colour split, blue on the left and orange on the right.
const SPLIT = "import React from 'react';import{AbsoluteFill,useCurrentFrame}from'remotion';export default function Split({Source,data}){const t=useCurrentFrame()-(data.at||0);const on=t>=0&&t<4;return <AbsoluteFill><Source/>{on&&<AbsoluteFill style={{background:'linear-gradient(90deg, rgba(60,100,255,0.5) 0%, rgba(60,100,255,0.5) '+(46+t*3)+'%, rgba(255,150,105,0.38) '+(46+t*3)+'%, rgba(255,150,105,0.38) 100%)',mixBlendMode:'color'}}/>}</AbsoluteFill>}";
const GRADE = "import React from 'react';import{AbsoluteFill,useCurrentFrame}from'remotion';export default function Vintage({Source,data}){const f=useCurrentFrame();const on=f>=(data.at||0);return <AbsoluteFill style={{filter:on?'sepia(0.14) saturate(0.82) contrast(1.07) brightness(0.97)':'none'}}><Source/></AbsoluteFill>}";
async function runScript(sdk,script,summary,commit) {
  const r=await sdk.runScript({script,summary,allowCommit:!!commit});
  if(r.isError||r.result==null) throw Error(r.output||'Selects returned no result.');
  return r.result;
}
// mac-only:start
// Analysis compiles Apple Vision (swiftc) and runs Python with Pillow through the macOS shell; the panel reaches these
// only when hostIsWindows() is false.
const q = s => "'" + String(s).replace(/'/g, "'\\''") + "'";
async function runShell(sdk,command,summary) {
  const r=await sdk.runShell({command,summary,timeoutMs:300000,maxOutputBytes:49152});
  if(r.isError||r.exitCode!==0) throw Error(r.stderr||r.output||'Preparation failed.');
  return r.stdout.trim();
}
// mac-only:end
// A 64x96 JPEG (base64, cover-cropped like preview.py) drawn in the panel from the photo's bytes; null when this host
// cannot decode it.
async function canvasThumb(path) {
  if(typeof createImageBitmap!=='function'||typeof document==='undefined') return null;
  const bitmap=await createImageBitmap(new Blob([await hostReadBytes(path)]));
  try {
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=96;
    const k=Math.max(64/bitmap.width,96/bitmap.height),w=bitmap.width*k,h=bitmap.height*k;
    canvas.getContext('2d').drawImage(bitmap,(64-w)/2,(96-h)/2,w,h);
    return canvas.toDataURL('image/jpeg',0.25).split(',')[1]||null;
  } finally {bitmap.close?.()}
}
// av-host:start
// Host I/O for a style-app panel: plain JS and self-contained (no app names, no UI text), so it can move to a shared
// kit file and tests can run it in node:vm. Guarded access to the host's renderer services (window.parent.__DI__,
// documented as internal, so every member is checked before use), the platform, path joins, file reads and removal,
// the install and data folders, and the host's bundled ffmpeg (Runtime.runFFmpeg / runFFprobe: argv arrays, no shell,
// nothing for the user to install). Paths are built with FileSystem.join and never pass through a console; generated
// file names are ASCII. There is no shell call at all (kit windows.md). Errors carry `code`: 'host-missing' (with `member`, a service method this Selects
// build lacks: the caller shows one "needs a newer Selects" message) or 'not-found' (no install folder).
function hostError(code, message, member = "") { return Object.assign(new Error(message), { code, member }); }
function hostDI() { try { return (window.parent && window.parent["__DI__"]) || null; } catch { return null; } }
// A host service when it has every named method, else null.
function hostApi(name, ...methods) {
  const s = hostDI()?.[name];
  return s && methods.every((m) => typeof s[m] === "function") ? s : null;
}
// A host service that must have `method`; throws a 'host-missing' error when this build lacks it.
function hostNeed(name, method) {
  const s = hostApi(name, method);
  if (!s) throw hostError("host-missing", "this Selects build has no " + name + "." + method, name + "." + method);
  return s;
}
// Windows or not: the host's own answer (Runtime.getPlatform: "win32", "darwin"), else the browser's.
function hostIsWindows() {
  try {
    const rt = hostApi("Runtime", "getPlatform");
    const p = rt ? String(rt.getPlatform() || "") : "";
    if (p) return /^win/i.test(p);
  } catch { /* the browser decides */ }
  try {
    const n = navigator;
    return /^win/i.test(String(n.platform || "")) || /Windows NT/i.test(String(n.userAgent || ""));
  } catch { return false; }
}
// Joins path parts with the host's join (the OS separator), or by hand with the OS separator.
function hostJoin(...parts) {
  const fs = hostApi("FileSystem", "join");
  if (fs) { try { return String(fs.join(...parts)); } catch { /* join by hand */ } }
  const sep = hostIsWindows() ? "\\" : "/";
  return parts.filter((x) => x !== "").map((x, i) => (i === 0 ? x.replace(/[\\/]+$/, "") : x.replace(/^[\\/]+|[\\/]+$/g, ""))).join(sep);
}
// A Buffer, ArrayBuffer or typed array as bytes (a Buffer may be a view into a larger pool). The value comes from the
// host window (window.parent), another JavaScript realm, so `instanceof ArrayBuffer` is false for it: the checks use
// the internal [[Class]] tag and array-likeness instead.
function hostBytes(v) {
  const tag = (x) => Object.prototype.toString.call(x);
  if (tag(v) === "[object ArrayBuffer]") return new Uint8Array(v);
  if (v && typeof v.byteLength === "number" && v.buffer && tag(v.buffer) === "[object ArrayBuffer]") {
    return new Uint8Array(v.buffer, v.byteOffset || 0, v.byteLength);
  }
  if (v && typeof v === "object" && typeof v.length === "number") return Uint8Array.from(v);
  throw hostError("read-failed", "the file could not be read");
}
// A file's bytes (FileSystem.readFile without an encoding).
async function hostReadBytes(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  if (typeof v === "string") throw hostError("read-failed", "the file came back as text");
  return hostBytes(v);
}
// A text file (some host builds return text directly, others bytes).
async function hostReadText(path) {
  const v = await hostNeed("FileSystem", "readFile").readFile(path);
  return typeof v === "string" ? v : new TextDecoder().decode(hostBytes(v));
}
// Removes a file with the first of the host's FileSystem removers that works (removeFile, remove, rm, unlink,
// unlinkSync: host builds differ); each is tried only when present, and a failure only leaves the file behind.
async function hostRemove(path) {
  let fs = null;
  try { fs = hostDI()?.FileSystem; } catch { fs = null; }
  if (!fs) return;
  const tries = [["removeFile", () => fs.removeFile({ filePath: path })], ["remove", () => fs.remove(path)], ["rm", () => fs.rm(path)],
    ["unlink", () => fs.unlink(path)], ["unlinkSync", () => fs.unlinkSync(path)]];
  for (const [name, call] of tries) {
    if (typeof fs[name] !== "function") continue;
    try { await call(); return; } catch { /* the next one */ }
  }
}
// The plugin's install folder and its data folder. The install folder is the host's skills folder (the home folder
// joined with .selects, skills and <id>, the same place SELECTS_USER_SKILLS_ROOT names on macOS and Windows) when it
// holds `marker` (a file every install has). `sdk` is unused (kept so callers do not change). The data folder (<home>/.selects/plugin-data/<id>) is created when missing;
// null when this host cannot make it (callers then avoid temporary files). Throws 'not-found' without an install folder.
async function hostRoots(sdk, id, marker) {
  const fs = hostApi("FileSystem", "join", "homedir", "existsSync");
  const holds = (dir) => { try { return !!dir && (!fs || !!fs.existsSync(fs.join(dir, marker))); } catch { return false; } };
  let plugin = null;
  try { if (fs) { const dir = String(fs.join(fs.homedir(), ".selects", "skills", id)); if (holds(dir)) plugin = dir; } } catch { plugin = null; }
  if (!plugin) throw hostError("not-found", "the plugin folder could not be found");
  let data = null;
  try {
    const dfs = hostApi("FileSystem", "join", "homedir", "mkdirSync");
    if (dfs) { data = String(dfs.join(dfs.homedir(), ".selects", "plugin-data", id)); dfs.mkdirSync(data, { recursive: true }); }
  } catch { data = null; }
  return { plugin, data };
}
// Mono 32-bit float samples of an audio file at `rate`, at most `maxSeconds`, decoded by the host's ffmpeg into a
// temporary file in `dataDir` and read back (the file is removed). null when this host has no ffmpeg or no data folder;
// throws when ffmpeg fails or `signal` (optional) aborts it.
async function hostDecodePcm(path, dataDir, rate, maxSeconds, signal, timeoutMs = 120000) {
  const rt = hostApi("Runtime", "runFFmpeg");
  if (!rt || !dataDir || !hostApi("FileSystem", "readFile")) return null;
  const tmp = hostJoin(dataDir, "pcm-" + Date.now() + "-" + Math.floor(Math.random() * 1e6) + ".f32");
  const controller = typeof AbortController === "undefined" ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  const relay = () => { if (controller) controller.abort(); };
  if (signal) { if (signal.aborted) relay(); else signal.addEventListener("abort", relay); }
  try {
    await rt.runFFmpeg(["-nostdin", "-v", "error", "-y", "-t", String(maxSeconds), "-i", path, "-ac", "1", "-ar", String(rate), "-f", "f32le", tmp], true, controller ? controller.signal : undefined);
    const bytes = await hostReadBytes(tmp);
    // A copy, so the samples sit on a 4-byte boundary.
    const samples = new Float32Array(bytes.slice(0, Math.floor(bytes.byteLength / 4) * 4).buffer);
    if (!samples.length) throw hostError("decode-failed", "ffmpeg returned no audio");
    return samples;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", relay);
    await hostRemove(tmp);
  }
}
// An audio or video file's length in seconds from the host's ffprobe, or null.
async function hostProbeSeconds(path) {
  try {
    const rt = hostApi("Runtime", "runFFprobe");
    if (!rt) return null;
    const r = await rt.runFFprobe(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path], true);
    const v = parseFloat(String(r?.stdout || "").trim());
    return v > 0 ? v : null;
  } catch { return null; }
}
// av-host:end

function isPhoto(x) {
  return x.type==='video' && /\.(jpe?g|png|webp)$/i.test(x.name)
    && !/-(base|sticker|cutout)\./i.test(x.name);
}

// ---- Windows: prepare.py's work without Python, Pillow or Apple Vision ----------------------------------------------
// The image work runs in cutout-engine.js (a Web Worker; its output equals prepare.py's on the same frame and mask, see
// tests/cutout_beat_gallery.test.mjs). People are cut out by Selects generation, the path Depth Type Captions uses on
// Windows: the photos go up as one short clip (each photo held HOLD frames), and the model's alpha comes back as a
// gray clip in this plugin's data folder. That uses Selects credits, so the panel asks first. Video files are written
// by the host's bundled ffmpeg (argv arrays, no shell).
const CLOUD_MODEL='model_v1_dmVlZC92aWRlby1iYWNrZ3JvdW5kLXJlbW92YWwvZmFzdA';
const CLOUD_MIN_HOST='2.0.512';
const CLOUD_FAILED=['failed','cancelled','input_failed','submission_rejected','upload_failed','handoff_failed'];
const HOLD=10;
const WIN_MIN_PHOTOS=22;
const FRAME_SIZE='1080x1920';
// '' when this host can make Windows cutouts, else the WORDS key that says why not.
function cloudProblem() {
  const mg=hostApi('MediaGeneration','submit','list','cancel');
  if(!mg||!hostApi('Runtime','runFFmpeg','runFFprobe')||!hostApi('FileSystem','join','homedir','existsSync','mkdirSync','readFile','writeFile','copyFile')) return 'newer';
  try {
    if(typeof mg.supportsPluginFiles!=='function'||!mg.supportsPluginFiles()) return 'newer';
    if(typeof mg.isAvailable==='function'&&!mg.isAvailable()) return 'noGeneration';
    const rt=hostApi('Runtime','getHostingVersion'),version=rt?String(rt.getHostingVersion()||''):'';
    const a=version.split('.').map(n=>parseInt(n,10)||0),b=CLOUD_MIN_HOST.split('.').map(Number);
    for(let i=0;i<3&&version;i++) if((a[i]||0)!==b[i]) return (a[i]||0)<b[i]?'newer':'';
    return '';
  } catch {return 'newer'}
}
function cloudScope(pid) {
  const m=String(window.parent?.location?.pathname||'').match(/\/libraries\/([^/]+)/);
  const libraryId=(m&&decodeURIComponent(m[1]))||hostDI()?.SequenceState?.getOnScreenTab?.()?.libraryId;
  if(!libraryId) throw Error('Could not tell which library this project is in. Reopen the project and try again.');
  return {libraryId,projectId:pid};
}
// cutout-engine.js in a blob Web Worker: call(op, args, transfer) resolves with the worker's answer.
function startEngine(source) {
  const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
  let worker=null,next=0;
  const waiting=new Map();
  const fail=err=>{for(const w of waiting.values())w.reject(err);waiting.clear()};
  try {worker=new Worker(url)} catch(e) {URL.revokeObjectURL(url);throw Error('The photo engine could not start: '+String(e?.message||e))}
  worker.onmessage=e=>{const {id,ok,error}=e.data||{},w=waiting.get(id);if(!w)return;waiting.delete(id);if(error)w.reject(Error(error));else w.resolve(ok)};
  worker.onerror=e=>{try{e?.preventDefault?.()}catch{}fail(Error('The photo engine stopped: '+String(e?.message||'worker error')))};
  return {
    call:(op,args,transfer=[])=>new Promise((resolve,reject)=>{const id=++next;waiting.set(id,{resolve,reject});worker.postMessage({id,op,args},transfer)}),
    stop:()=>{try{worker.terminate()}catch{}URL.revokeObjectURL(url);fail(Error('Canceled.'))},
  };
}
// The host's ffmpeg with an argv array; `control.abort` (set while it runs) stops it.
async function hostFFmpeg(args,control) {
  const rt=hostNeed('Runtime','runFFmpeg'),ac=typeof AbortController==='undefined'?null:new AbortController();
  if(control) control.abort=()=>ac?.abort();
  try {return await rt.runFFmpeg(['-nostdin','-v','error','-y',...args],true,ac?ac.signal:undefined)}
  catch(e) {if(control?.canceled)throw Error('Canceled.');throw Error(String(e?.message||e||'ffmpeg failed').trim().slice(0,300))}
  finally {if(control)control.abort=null}
}
// Which of the encoders prepare.py uses this ffmpeg has, with fallbacks that keep the same sizes and frame counts:
// stickers ProRes 4444 (Selects shows its alpha), else QuickTime Animation, else PNG in .mov; scenes H.264, else MPEG-4.
const encoderCache={choice:null};
async function encoders() {
  if(encoderCache.choice) return encoderCache.choice;
  let list='';
  try {const r=await hostNeed('Runtime','runFFmpeg').runFFmpeg(['-hide_banner','-encoders'],true);list=String(r?.stdout||'')+String(r?.stderr||'')} catch {list=''}
  const has=n=>new RegExp('^\\s*V\\S*\\s+'+n+'\\s','m').test(list);
  encoderCache.choice={
    alpha:has('prores_ks')||!list?['-c:v','prores_ks','-profile:v','4444','-pix_fmt','yuva444p10le','-alpha_bits','16']
      :has('qtrle')?['-c:v','qtrle','-pix_fmt','argb']:['-c:v','png','-pix_fmt','rgba'],
    base:has('libx264')||!list?['-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p']:['-c:v','mpeg4','-q:v','2','-pix_fmt','yuv420p'],
    clip:has('libx264')||!list?['-c:v','libx264','-preset','veryfast','-crf','12','-pix_fmt','yuv420p']:['-c:v','mpeg4','-q:v','1','-pix_fmt','yuv420p'],
  };
  return encoderCache.choice;
}
const pad2=i=>String(i).padStart(2,'0');
const fileName=p=>String(p).split(/[\\/]/).pop();
// prepare.py's first loop: duplicates, landscape, small and near-duplicate photos are skipped; the rest become
// 1080x1920 frames (raw RGB in `work`). Free: nothing leaves the computer.
async function winFrames({engine,work,photos,onStatus,control}) {
  const fs=hostNeed('FileSystem','writeFile'),seen=[],previous=[],frames=[],rejected=[];
  for(const [k,photo] of photos.entries()) {
    if(control?.canceled) throw Error('Canceled.');
    const name=fileName(photo.path);
    onStatus?.(k+1,photos.length);
    let bytes;
    try {bytes=new Uint8Array(await hostReadBytes(photo.path))} catch(e) {rejected.push({name,reason:String(e?.message||e).slice(0,120)});continue}
    // The worker hashes the file (SHA-256, as prepare.py does) before it decodes it.
    const r=await engine.call('frame',{bytes:bytes.buffer,previous,seen},[bytes.buffer]);
    if(r.reason!=='duplicate photo'&&r.digest) seen.push(r.digest);
    if(r.reason) {rejected.push({name,reason:r.reason});continue}
    previous.push({bits:r.bits,tiny:r.tiny});
    const raw=hostJoin(work,pad2(frames.length+1)+'.rgb');
    await fs.writeFile(raw,r.frame);
    frames.push({name,raw});
  }
  return {frames,rejected};
}
// Everything after the free part: person masks from Selects generation (credits), then prepare.py's choices, sticker
// layers and scene clips in out/, and its result. `control.canceled` stops it between steps.
async function winCutouts({engine,plugin,data,work,name,pid,frames,rejected,onStatus,control}) {
  const fs=hostNeed('FileSystem','join'),mg=hostNeed('MediaGeneration','submit'),enc=await encoders();
  const check=()=>{if(control?.canceled)throw Error('Canceled.')};
  // 1. The photos as one clip, each held HOLD frames at 30 fps.
  const clip=hostJoin(work,'cutout-input.mp4'),seconds=frames.length*HOLD/30;
  const inputs=[],chain=[];
  frames.forEach((f,k)=>{inputs.push('-f','rawvideo','-pix_fmt','rgb24','-video_size',FRAME_SIZE,'-framerate','30','-i',f.raw);chain.push('['+k+':v]loop=loop='+(HOLD-1)+':size=1:start=0,setpts=N/30/TB[v'+k+']')});
  onStatus?.('upload');
  await hostFFmpeg([...inputs,'-filter_complex',chain.join(';')+';'+frames.map((_,k)=>'[v'+k+']').join('')+'concat=n='+frames.length+':v=1:a=0[out]','-map','[out]','-an',...enc.clip,'-r','30','-movflags','+faststart',clip],control);
  check();
  // 2. Selects generation; the key is fixed per run, so a resend after a reload does not pay twice.
  const scope=cloudScope(pid);
  let jobId;
  try {
    jobId=(await mg.submit({scope,key:'cbg-'+name,modelId:CLOUD_MODEL,
      input:{video_url:'selects-input:source',output_codec:'h264',refine_foreground_edges:false,subject_is_person:true},
      inputMediaSeconds:{video:seconds},uploads:{source:{pluginFile:clip}},delivery:{pluginFolder:hostJoin(work,'cloud')},
      outputName:'person-masks',batch:1,origin:{tool:'video',tab:'cutout-beat-gallery',recipeId:'person-masks'}})).jobIds[0];
  } catch(e) {throw Object.assign(Error(String(e?.code||e?.message||'submit failed')),{cloud:String(e?.code||e?.message||'')})}
  control.stopCloud=()=>mg.cancel(scope,jobId).catch(()=>{});
  const started=Date.now();
  let alpha=null;
  try {
    for(;;) {
      if(control?.canceled) {await control.stopCloud();throw Error('Canceled.')}
      await new Promise(r=>setTimeout(r,1000));
      const j=(await mg.list(scope)).find(x=>x.jobId===jobId);
      if(!j) continue;
      if(j.deliveryStatus==='delivered') {alpha=(j.outputs||[]).find(o=>o.path)?.path||null;break}
      if(CLOUD_FAILED.includes(j.status)||['download_failed','result_collection_failed'].includes(j.deliveryStatus))
        throw Object.assign(Error('Person cutouts failed'+(j.errorCode?' ('+j.errorCode+')':'')+'.'),{cloud:j.errorCode||j.status});
      onStatus?.('wait',Math.round((Date.now()-started)/1000));
      if(Date.now()-started>20*60000) {await control.stopCloud();throw Error('Person cutouts took too long. Try again.')}
    }
  } finally {control.stopCloud=null}
  if(!alpha) throw Error('No person cutouts came back. Try again.');
  // 3. The masks: the alpha frame 6.5 frames into each photo's hold (by time, so another output frame rate still
  //    maps), refused when the clip came back with another length.
  const probe=await hostNeed('Runtime','runFFprobe').runFFprobe(['-v','error','-select_streams','v:0','-show_entries','stream=width,height:format=duration','-of','json',alpha],true);
  const info=JSON.parse(String(probe?.stdout||'{}')),stream=(info.streams||[])[0]||{},width=Number(stream.width),height=Number(stream.height),duration=Number(info.format?.duration);
  if(!(width>0&&height>0)) throw Error('The person cutouts could not be read.');
  if(!(Math.abs(duration-seconds)<=HOLD/30+0.05)) throw Error('The person cutouts came back '+(duration||0).toFixed(2)+' s long instead of '+seconds.toFixed(2)+' s. Try again.');
  onStatus?.('masks');
  const rows=[],good=[];
  for(const [k,f] of frames.entries()) {
    check();
    const i=k+1,gray=hostJoin(work,pad2(i)+'.gray');
    try {
      await hostFFmpeg(['-ss',((k*HOLD+6.5)/30).toFixed(4),'-i',alpha,'-frames:v','1','-f','rawvideo','-pix_fmt','gray',gray],control);
      const bytes=new Uint8Array(await hostReadBytes(gray));
      if(bytes.length!==width*height) throw Error('Mask error: no frame');
      const q=await engine.call('mask',{gray:bytes.buffer,w:width,h:height},[bytes.buffer]);
      if(q.ok) {good.push(i);await hostNeed('FileSystem','writeFile').writeFile(hostJoin(work,pad2(i)+'.mask'),q.mask)}
      rows.push({index:i,name:f.name,stickerReady:q.ok,...q.metrics});
    } catch(e) {if(control?.canceled)throw e;rows.push({index:i,name:f.name,stickerReady:false,reason:String(e?.message||e).slice(0,120)})}
    finally {await hostRemove(gray)}
  }
  // 4. prepare.py's choices, then the layers and clips it would write.
  const plan=await engine.call('plan',{rows,good,photoCount:frames.length,rejected});
  if(!plan.ready) return plan;
  onStatus?.('render');
  const out=hostJoin(data,'runs',name);
  hostNeed('FileSystem','mkdirSync').mkdirSync(out,{recursive:true});
  const boxes={},still=['-f','rawvideo','-video_size',FRAME_SIZE,'-framerate','30'],hold=['-vf','loop=loop=-1:size=1:start=0','-an'];
  for(const l of plan.layers) {
    check();
    const frame=new Uint8Array(await hostReadBytes(frames[l.index-1].raw)),mask=new Uint8Array(await hostReadBytes(hostJoin(work,pad2(l.index)+'.mask')));
    const r=await engine.call('layer',{frame:frame.buffer,mask:mask.buffer,style:l.style,outline:l.outline},[frame.buffer,mask.buffer]);
    boxes[l.file]=r.box;
    // The revealed photo keeps the outline its sticker arrived with.
    if(r.shown) await hostNeed('FileSystem','writeFile').writeFile(frames[l.index-1].raw,r.shown);
    const raw=hostJoin(work,'layer.rgba');
    await hostNeed('FileSystem','writeFile').writeFile(raw,r.layer);
    await hostFFmpeg([...still,'-pix_fmt','rgba','-i',raw,...hold,'-frames:v','60',...enc.alpha,'-write_tmcd','0',hostJoin(out,l.file)],control);
  }
  for(const b of plan.bases) {
    check();
    await hostFFmpeg([...still,'-pix_fmt','rgb24','-i',frames[b.index-1].raw,...hold,'-frames:v',String(b.frames),...enc.base,'-movflags','+faststart','-f','mp4',hostJoin(out,b.file)],control);
  }
  await hostNeed('FileSystem','copyFile').copyFile(hostJoin(plugin,'fixed-bgm.mp3'),hostJoin(out,'fixed-bgm.mp3'));
  return engine.call('finish',{plan,rows,boxes,rejected,extra:{outputDir:out,folder:name}});
}
function removeWork(work) {
  try {hostDI()?.FileSystem?.rmSync?.(work,{recursive:true,force:true})} catch { /* left for the next run */ }
}

export default function Panel({sdk,context,ui}) {
  const t=WORDS[context.language]??WORDS.en;
  const [rows,setRows]=React.useState([]);
  const [folder,setFolder]=React.useState('*');
  const [busy,setBusy]=React.useState(false);
  const [status,setStatus]=React.useState('');
  const [failed,setFailed]=React.useState(false);
  const [analysis,setAnalysis]=React.useState(null);
  const [confirmed,setConfirmed]=React.useState(false);
  const [excluded,setExcluded]=React.useState([]);
  const [thumbs,setThumbs]=React.useState({});
  const guard=React.useRef(false);
  // Windows cuts people out with Selects generation (credits): the free part of the analysis runs first and keeps its
  // frames in `pending` until the user agrees to send them. A Selects build without that service shows why.
  const winProblem=hostIsWindows()?cloudProblem():'';
  const [pending,setPending]=React.useState(null);
  const pendingRef=React.useRef(null);
  const control=React.useRef(null);
  const say=(text,values)=>text.replace(/\{(\w+)\}/g,(m,k)=>k in values?String(values[k]):m);
  const discard=React.useCallback(()=>{
    const p=pendingRef.current;
    if(!p) return;
    pendingRef.current=null;setPending(null);
    p.engine.stop();removeWork(p.work);
  },[]);
  const photos=rows.filter(isPhoto).filter(x=>folder==='*'||x.folder===folder);
  const selected=photos.filter(x=>!excluded.includes(x.path));
  const folders=[...new Set(rows.filter(isPhoto).map(x=>x.folder))].sort();
  const reviewPairs=analysis&&!analysis.result.exactReference
    ? (analysis.result.cues||[]).filter((cue,i,all)=>all.findIndex(c=>c.file===cue.file)===i).map((cue,i)=>{
        const baseIndex=SCENE_EDGES.findIndex((edge,j)=>j<SCENE_EDGES.length-1&&cue.start>=edge&&cue.start<SCENE_EDGES[j+1])+1;
        const baseName=analysis.result.rows?.find(r=>(r.baseSlot??r.index)===baseIndex)?.name;
        const stickerName=analysis.result.rows?.find(r=>r.stickerNumber===i+1)?.name;
        return {baseIndex,baseName,stickerName,number:i+1};
      }) : [];

  React.useEffect(()=>{
    const chosen=photos.slice(0,80);
    if(!chosen.length){setThumbs({});return}
    let active=true;
    if(hostIsWindows()) {
      (async()=>{
        const next={};
        for(const x of chosen) {
          if(!active) return;
          try {next[x.path]=await canvasThumb(x.path)} catch {next[x.path]=null}
        }
        if(active) setThumbs(next);
      })();
      return()=>{active=false};
    }
    // mac-only:start
    const batches=[];for(let i=0;i<chosen.length;i+=20)batches.push(chosen.slice(i,i+20));
    Promise.all(batches.map(batch=>{
      const command='python3 "$SELECTS_USER_SKILLS_ROOT/cutout-beat-gallery/preview.py" '+batch.map(x=>'--photo '+q(x.path)).join(' ');
      return sdk.runShell({command,summary:'Preview photo choices',timeoutMs:30000,maxOutputBytes:49152});
    })).then(replies=>{if(!active)return;const result=replies.flatMap(r=>r.isError||r.exitCode!==0?[]:JSON.parse(r.stdout.trim()));setThumbs(Object.fromEntries(result.map(x=>[x.path,x.jpeg])));})
      .catch(()=>{});
    // mac-only:end
    return()=>{active=false};
  },[sdk,folder,rows]);

  const refresh=React.useCallback(async()=>{
    if(!context.projectId) return;
    try {
      const pid=context.projectId;
      const code="const p=selects.project("+JSON.stringify(pid)+");const o=await p.sourceFiles();const rows=[];const walk=(arr,folder)=>{for(const x of arr){if(x.type==='dir')walk(x.children,x.name);else rows.push({name:x.name,path:x.path,resourceId:x.resourceId,type:x.type,folder})}};if('fileTree'in o)walk(o.fileTree,'(root)');else for(const f of o.folders){const v=await p.sourceFiles({folder:f.name});if('fileTree'in v)walk(v.fileTree,f.name)}return rows.sort((a,b)=>a.name.localeCompare(b.name));";
      const nextRows=await runScript(sdk,code,'Read project photos',false);
      setRows(nextRows);
      setAnalysis(null);
      setConfirmed(false);
      setFolder(prev=>{
        if(prev!=='*'&&nextRows.some(x=>x.folder===prev)) return prev;
        return nextRows.some(x=>x.folder==='beat-cutout-reference-v2')?'beat-cutout-reference-v2':'*';
      });
      setStatus('');
      setFailed(false);
      return nextRows;
    } catch(e) {setStatus(String(e.message||e));setFailed(true);return null}
  },[sdk,context.projectId]);
  React.useEffect(()=>{refresh();},[refresh]);
  // A new selection drops frames that were waiting to be sent; so does closing the panel.
  React.useEffect(()=>{if(!guard.current)discard()},[folder,excluded,rows,discard]);
  React.useEffect(()=>()=>{control.current&&(control.current.canceled=true);discard()},[discard]);

  const showResult=(result,name,pid)=>{
    if(!result.ready) {
      const modelFailure=(result.rows||[]).find(x=>/Mask error|inference plan|model/i.test(x.reason||''));
      if(modelFailure) {setStatus(t.error+'The person segmentation model could not run. Check the setup and try again.');setFailed(true);return}
      const base=Math.max(0,result.needBase-result.base),stickers=Math.max(0,result.needStickers-result.stickers);
      if(base>0) setStatus(`${result.base} portrait photos found. Add ${base} more to continue.`);
      else setStatus(`${result.stickers} separate photos can make stickers. Add ${stickers} more portrait photos with people fully inside the frame.`);
      setFailed(true);return;
    }
    setAnalysis({result,name,pid});
    setStatus(result.exactReference
      ? ('Approved photos and stickers match the reference. You can create the reference Draft.')
      : (`Photo check passed: ${result.base} scenes and ${result.stickers} stickers. Review the placement before making the video.`));
    setFailed(false);
  };
  React.useEffect(()=>sdk.on('resourcesChanged',e=>{if(e.projectId===context.projectId)refresh()}),[sdk,context.projectId,refresh]);

  const analyze=async()=>{
    if(guard.current) return;
    if(winProblem) {setStatus(t[winProblem]);setFailed(true);return}
    if(!context.projectId) {setStatus(t.noProject);setFailed(true);return}
    if(folder==='*') {setStatus('Choose a photo folder first.');setFailed(true);return}
    guard.current=true;setBusy(true);setFailed(false);setStatus(t.busy);setConfirmed(false);
    try {
      const pid=context.projectId;
      const latest=await refresh();
      if(!latest) throw Error('Could not refresh project photos.');
      const chosenFolder=latest.some(x=>x.folder===folder)?folder:'';
      if(!chosenFolder) throw Error('Selected photo folder is no longer available. Refresh and choose a folder.');
      const selectedPhotos=latest.filter(isPhoto).filter(x=>x.folder===chosenFolder&&!excluded.includes(x.path));
      const approved=latest.filter(x=>x.folder===chosenFolder&&/^\d{2}-sticker\.png$/i.test(x.name)).sort((a,b)=>a.name.localeCompare(b.name));
      if(approved.length&&approved.length!==12) throw Error('The approved reference set needs all 12 sticker layers.');
      if(selectedPhotos.length<15) {
        const missing=15-selectedPhotos.length;
        setStatus(`${selectedPhotos.length} portrait photos found. Add ${missing} more to continue.`);
        setFailed(true);return;
      }
      const name='beat-cutout-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
      let result;
      if(hostIsWindows()) {
        // The approved reference set is rebuilt by the macOS engine only.
        if(approved.length) {setStatus(t.macOnly);setFailed(true);return}
        discard();
        const {plugin,data}=await hostRoots(sdk,'cutout-beat-gallery','cutout-engine.js');
        if(!data) throw Error('The plugin data folder could not be made.');
        const engine=startEngine(await hostReadText(hostJoin(plugin,'cutout-engine.js')));
        const work=hostJoin(data,'work',name),ctl={canceled:false,engine};
        control.current=ctl;
        try {
          hostNeed('FileSystem','mkdirSync').mkdirSync(work,{recursive:true});
          const {frames,rejected}=await winFrames({engine,work,photos:selectedPhotos,control:ctl,onStatus:(k,n)=>setStatus(say(t.framing,{k,n}))});
          // Credits are asked for only when the folder can still make a video (15 scenes and at least 7 separate
          // stickers); prepare.py would find out after the masks.
          if(frames.length>=WIN_MIN_PHOTOS) {
            pendingRef.current={engine,plugin,data,work,name,pid,frames,rejected};
            setPending(pendingRef.current);setStatus('');setFailed(false);return;
          }
          result={ready:false,base:frames.length,stickers:0,needBase:WIN_MIN_PHOTOS,needStickers:13,rejected};
        } catch(e) {if(pendingRef.current?.work!==work){engine.stop();removeWork(work)}throw e}
        finally {control.current=null}
        if(pendingRef.current?.work!==work) {engine.stop();removeWork(work)}
      } else {
      // mac-only:start
      const root='SK="$SELECTS_USER_SKILLS_ROOT/cutout-beat-gallery"; DATA="$HOME/.selects/plugin-data/cutout-beat-gallery"; ';
      if(!approved.length) await runShell(sdk,root+'mkdir -p "$DATA/bin" "$DATA/cache" "$DATA/runs"; if [ ! -x "$DATA/bin/foreground-mask" ] || [ "$SK/foreground-mask.swift" -nt "$DATA/bin/foreground-mask" ]; then CLANG_MODULE_CACHE_PATH="$DATA/cache" SWIFT_MODULE_CACHE_PATH="$DATA/cache" swiftc -module-cache-path "$DATA/cache" "$SK/foreground-mask.swift" -o "$DATA/bin/foreground-mask"; fi','Prepare person mask model');
      else await runShell(sdk,root+'mkdir -p "$DATA/runs"','Prepare approved reference');
      const inputs=selectedPhotos.map(x=>'--input '+q(x.path)).join(' ');
      const stickers=approved.map(x=>'--sticker '+q(x.path)).join(' ');
      const reference=approved.length?' --reference-master "$SK/approved-master.mp4" --reference-manifest "$SK/reference-manifest.json"':'';
      const command=root+'python3 "$SK/prepare.py" --output "$DATA/runs/'+name+'" --masker "$DATA/bin/foreground-mask" --bgm "$SK/fixed-bgm.mp3" '+inputs+' '+stickers+reference;
      result=JSON.parse(await runShell(sdk,command,'Analyze and prepare photos'));
      // mac-only:end
      }
      showResult(result,name,pid);
    } catch(e) {setStatus(t.error+String(e.message||e));setFailed(true)}
    finally {guard.current=false;setBusy(false)}
  };

  // Windows, after the user agreed to use credits: person masks from Selects generation, then the layers.
  const sendCloud=async()=>{
    const p=pendingRef.current;
    if(guard.current||!p) return;
    guard.current=true;setBusy(true);setFailed(false);setStatus(t.uploading);
    const ctl={canceled:false,engine:p.engine};
    control.current=ctl;
    try {
      const result=await winCutouts({...p,control:ctl,
        onStatus:(step,s)=>setStatus(step==='wait'?say(t.cloudWait,{s}):step==='masks'?t.masking:step==='render'?t.making:t.uploading)});
      showResult(result,p.name,p.pid);
    } catch(e) {
      const code=String(e?.cloud||'');
      setStatus(code==='insufficient_credits'?t.noCredits:code==='generation_disabled'?t.noGeneration:code==='generation_update_required'?t.newer
        :t.error+String(e.message||e));
      setFailed(true);
    } finally {
      control.current=null;
      if(pendingRef.current===p) {pendingRef.current=null;setPending(null)}
      p.engine.stop();removeWork(p.work);
      guard.current=false;setBusy(false);
    }
  };
  const cancelWindows=()=>{
    const ctl=control.current;
    // Stopping the engine rejects a photo step that is still running, so Cancel never waits on it.
    if(ctl) {ctl.canceled=true;ctl.abort?.();ctl.engine?.stop()}
    else discard();
  };

  const build=async()=>{
    if(guard.current||!analysis||(!analysis.result.exactReference&&!confirmed)) return;
    guard.current=true;setBusy(true);setFailed(false);setStatus('Creating video…');
    try {
      const {result,name,pid}=analysis;
      if(result.exactReference) {
        const imported=await runScript(sdk,'return await selects.project('+JSON.stringify(pid)+').importFiles({paths: '+JSON.stringify([result.editableDir])+'});','Import editable scene layers',true);
        if((imported.addedResourceIds||[]).length!==29) throw Error('Some editable scene layers could not be imported.');
        const exactCode="const p=selects.project("+JSON.stringify(pid)+");const files=(await p.sourceFiles({folder:"+JSON.stringify(result.editableFolder)+"})).fileTree;const ids=new Map(files.filter(x=>x.type!=='dir').map(x=>[x.name,x.resourceId]));const d=await p.createDraft({name:"+JSON.stringify('Beat Cutout Gallery · Editable · '+name)+"});await d.setFrameSize({width:1080,height:1920});for(let i=1;i<=24;i++){const id=ids.get(String(i).padStart(2,'0')+'-scene.mp4');if(!id)throw Error('Missing scene '+i);await d.insertResource({resourceId:id})}if((await d.meta()).durationFrames!==478)throw Error('Scene duration mismatch');for(const [i,a,b] of [[1,29,40],[2,61,72],[3,93,104],[4,132,140]]){const id=ids.get(String(i).padStart(2,'0')+'-entrance.mov');if(!id)throw Error('Missing entrance '+i);await d.overlayResource({resource:await p.resource(id),over:await d.rangeAtFrames(a,b)})}const music=ids.get('reference-audio.m4a');if(!music)throw Error('Missing audio');await d.overlayResource({resource:await p.resource(music),over:await d.rangeAtFrames(0,478)});const saved=await d.commitAll('Create editable approved reference draft');if(!saved.createdDraftId)throw Error('Draft did not save');await selects.editor.openDraft(saved.createdDraftId);return {draftId:saved.createdDraftId,frames:(await d.meta()).durationFrames,scenes:24,entrances:4,audio:1};";
        await runScript(sdk,exactCode,'Create editable approved draft',true);
        setStatus(t.exactDone+' '+result.outputVideo);setFailed(false);return;
      }
      const imported=await runScript(sdk,'return await selects.project('+JSON.stringify(pid)+').importFiles({paths: '+JSON.stringify([result.outputDir])+'});','Import editable layers',true);
      if((imported.addedResourceIds||[]).length<result.base+result.stickers+1) throw Error('Some prepared layers were not imported.');
      const cues=JSON.stringify(result.cues||CUES.slice(0,result.stickers).map((c,i)=>({...c,file:String(i+1).padStart(2,'0')+'-sticker.mov',...(result.approvedStickers?{x:0,y:0,s:1}:{})})));
      const code="const p=selects.project("+JSON.stringify(pid)+");const f=(await p.sourceFiles({folder:"+JSON.stringify(name)+"})).fileTree;const ids=new Map(f.filter(x=>x.type!=='dir').map(x=>[x.name,x.resourceId]));const d=await p.createDraft({name:"+JSON.stringify('Beat Cutout Gallery · '+name)+"});await d.setFrameSize({width:1080,height:1920});const fps=(await d.meta()).fps;for(let i=0;i<"+result.base+";i++){const id=ids.get(String(i+1).padStart(2,'0')+'-base.mp4');if(!id)throw Error('Missing base '+i);await d.insertResource({resourceId:id})}const before=(await d.meta()).durationFrames;const expected=Math.round(478*fps/30);if(before!==expected)await d.trimBoundary({frame:before,side:'before',byFrames:expected-before});const total=(await d.meta()).durationFrames;const at=n=>Math.min(total,Math.round(n*fps/30));const cues=("+cues+").map(c=>({...c,start:at(c.start),end:at(c.end)}));for(let i=0;i<cues.length;i++){const c=cues[i],id=ids.get(c.file);if(!id)throw Error('Missing sticker '+c.file);await d.overlayResource({resource:await p.resource(id),over:await d.rangeAtFrames(c.start,c.end)});const clip=(await d.clips({trackScope:'all'})).find(x=>x.trackKind==='video'&&x.resourceId===id&&x.startFrame===c.start);if(clip)await d.addVideoEffect({clip,label:'Sticker entrance',tsxCode:"+JSON.stringify(MOTION)+",parameters:{dir:c.dir,x:c.x,y:c.y,s:c.s},editableParameters:[{key:'x',label:'Horizontal position',type:'number',defaultValue:c.x,min:-600,max:600,step:5},{key:'y',label:'Vertical position',type:'number',defaultValue:c.y,min:-900,max:900,step:5},{key:'s',label:'Size',type:'number',defaultValue:c.s,min:.3,max:1.3,step:.01}]})}const music=ids.get('fixed-bgm.mp3');if(!music)throw Error('Fixed music missing');await d.overlayResource({resource:await p.resource(music),over:await d.rangeAtFrames(0,total)});for(let i=0;i<"+result.base+";i++){const id=ids.get(String(i+1).padStart(2,'0')+'-base.mp4');const all=await d.clips({trackScope:'all'});const clip=all.find(x=>x.trackKind==='main'&&x.resourceId===id);if(!clip)continue;const cue=cues.find(x=>x.start>=clip.startFrame&&x.start<clip.endFrame);if(cue)await d.addVideoEffect({clip,label:'Warm vintage after sticker',tsxCode:"+JSON.stringify(GRADE)+",parameters:{at:cue.start-clip.startFrame}})}const fx=async(slot,label,code,params)=>{const id=ids.get(String(slot).padStart(2,'0')+'-base.mp4');const clip=(await d.clips({trackScope:'all'})).find(x=>x.trackKind==='main'&&x.resourceId===id);if(clip)await d.addVideoEffect({clip,label,tsxCode:code,parameters:{...params,at:params.at-clip.startFrame}})};const spot="+JSON.stringify(result.spot||null)+";if(spot){await fx(6,'Spotlight and tint',"+JSON.stringify(SPOT)+",{at:at(211),x:spot.x,y:spot.y});await fx(15,'Colour split',"+JSON.stringify(SPLIT)+",{at:at(438)})}const saved=await d.commitAll('Create fixed beat cutout template');if(!saved.createdDraftId)throw Error('Draft did not save');await selects.editor.openDraft(saved.createdDraftId);return {draftId:saved.createdDraftId,bases:"+result.base+",stickers:"+result.stickers+",audio:1,frames:total};";
      await runScript(sdk,code,'Create editable beat draft',true);
      setStatus(t.done+' '+t.export);setFailed(false);
    } catch(e) {setStatus(t.error+String(e.message||e));setFailed(true)}
    finally {guard.current=false;setBusy(false)}
  };
  if(!context.projectId) return <ui.Message tone="muted">{t.noProject}</ui.Message>;
  return <div><h2>{t.title}</h2><p>{t.intro}</p>
    {winProblem&&<ui.Message tone="muted">{t[winProblem]}</ui.Message>}
    {status&&<ui.Message tone={failed?'error':'success'}>{status}</ui.Message>}
    <ui.Section title={t.selected}>
      <ui.Select label={t.folder} value={folder} options={[{value:'*',label:'Choose photo folder'},...folders.map(f=>({value:f,label:f}))]} onChange={v=>{setFolder(v);setExcluded([]);setAnalysis(null);setConfirmed(false);setStatus('');setFailed(false)}} disabled={busy}/>
      <p>{selected.length}/{photos.length} · {t.fixed}</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:6,maxHeight:430,overflowY:'auto',scrollbarGutter:'stable'}}>
        {photos.slice(0,80).map(x=>{const on=!excluded.includes(x.path);const check=analysis?.result?.rows?.find(r=>r.name===x.name);const rejected=analysis?.result?.rejected?.find(r=>r.name===x.name);const rank=check?.baseSlot||0;return <button key={x.path} type="button" disabled={busy||folder==='beat-cutout-reference-v2'} onClick={()=>{setExcluded(prev=>on?[...prev,x.path]:prev.filter(p=>p!==x.path));setAnalysis(null);setConfirmed(false);setStatus('');setFailed(false)}} style={{padding:3,background:on?'#264638':'#252525',color:'#fff',border:on?'2px solid #75d39a':'2px solid #555',borderRadius:5,textAlign:'left',cursor:'pointer'}} aria-pressed={on} title={x.name}>
          {thumbs[x.path]?<img src={'data:image/jpeg;base64,'+thumbs[x.path]} alt={x.name} style={{display:'block',width:'100%',height:110,objectFit:'cover',opacity:on?1:.35}}/>:<div style={{height:110,background:'#333'}}/>}
          <span style={{display:'block',fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{on?'✓ ':'○ '}{x.name}{on&&rank>0&&rank<=15?' · B'+rank:''}{check?.stickerNumber?' · S'+check.stickerNumber:''}{rejected?' · ×':''}</span>
        </button>})}
      </div>
      {photos.length>80&&<p>{'Only the first 80 are previewed. Split this folder into smaller groups.'}</p>}
      <ui.Actions><ui.Button variant="secondary" disabled={busy} onClick={refresh}>{t.refresh}</ui.Button></ui.Actions>
    </ui.Section>
    {reviewPairs.length>0&&<ui.Section title={'Scene and sticker pairs'}>
      <p>{'These pairs follow the actual beat order. Change the photo selection and analyze again if a pair looks unrelated.'}</p>
      <div style={{maxHeight:400,overflowY:'auto',scrollbarGutter:'stable',display:'grid',gap:6}}>
        {reviewPairs.map(pair=>{
          const base=photos.find(x=>x.name===pair.baseName),sticker=photos.find(x=>x.name===pair.stickerName);
          return <div key={pair.number} style={{display:'grid',gridTemplateColumns:'38px 1fr 1fr',gap:6,alignItems:'center',border:'1px solid #555',borderRadius:5,padding:4,fontSize:10}}>
            <strong>#{pair.number}</strong>
            {[base,sticker].map((photo,k)=><div key={k} style={{minWidth:0}}>{photo&&thumbs[photo.path]?<img src={'data:image/jpeg;base64,'+thumbs[photo.path]} alt={photo.name} style={{width:'100%',height:68,objectFit:'cover'}}/>:<div style={{height:68,background:'#333'}}/>}<div style={{overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{k===0?'B'+pair.baseIndex:'S'+pair.number} · {photo?.name||'?'}</div></div>)}
          </div>;
        })}
      </div>
    </ui.Section>}
    {analysis&&!analysis.result.exactReference&&<label style={{display:'flex',gap:8,alignItems:'flex-start',fontSize:12,margin:'12px 0'}}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{'I reviewed the photo order, subjects, and background combinations.'}</label>}
    {pending&&!busy&&<ui.Section title={t.analyze}>
      <ui.Message tone="muted">{say(t.credits,{n:pending.frames.length,s:(pending.frames.length*HOLD/30).toFixed(1)})}</ui.Message>
      <ui.Actions><ui.Button variant="secondary" onClick={cancelWindows}>{t.cancel}</ui.Button><ui.Button variant="primary" onClick={sendCloud}>{say(t.send,{n:pending.frames.length})}</ui.Button></ui.Actions>
    </ui.Section>}
    {busy&&hostIsWindows()&&<ui.Actions><ui.Button variant="secondary" onClick={cancelWindows}>{t.cancel}</ui.Button></ui.Actions>}
    <ui.Actions><ui.Button variant="secondary" busy={busy} busyLabel={t.busy} disabled={busy||!!winProblem} onClick={analyze}>{t.analyze}</ui.Button><ui.Button variant="primary" disabled={busy||!analysis||(!analysis.result.exactReference&&!confirmed)} onClick={build}>{t.build}</ui.Button></ui.Actions>
  </div>;
}
