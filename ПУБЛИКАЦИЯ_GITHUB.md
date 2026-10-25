# Публикация в sensormob22-sketch

Целевой репозиторий: `sensormob22-sketch/digital-geography` (новый, отдельный от DeskCat и Panorama).

1. Создайте репозиторий через https://github.com/new под аккаунтом `sensormob22-sketch`.
   Имя: `digital-geography`. Выберите Public или Private по желанию.
   Не добавляйте секретов, токенов, персональных данных. Можно создать пустой репозиторий.
2. После создания попросите ChatGPT загрузить подготовленный проект в этот репозиторий.
   Подключение GitHub уже даёт доступ на запись файлов **в существующие репозитории**.
3. Для самостоятельной публикации через git, в корне проекта:

   ```bash
   git remote add origin https://github.com/sensormob22-sketch/digital-geography.git
   git push -u origin main
   ```

4. После появления `main` настройте Cloudflare Pages → Connect to Git.
   Build command: `npm run build`; Output directory: `dist`; Root: `/`.
5. Включите HTTPS (на pages.dev уже включён), проверьте установку PWA и офлайн-режим на реальных устройствах.

**Важно:** GitHub-репозиторий и Cloudflare-сайт пока не созданы. Данный каталог и Git-bundle подготовлены для дальнейшего размещения.
