# HostFly: безопасная подготовка релизов

Домен: geodigital.by. Основная ветка кода: `deploy/hostfly`.
Пользователь отключил интеграцию Netlify в своей панели. Ветка `deploy/hostfly` создана от актуального `deploy/netlify`; история и код сохранены. Новый workflow выполняет прежние тесты, собирает геоданные и не публикует ничего до включения защиты.

## 0. Безопасность
Если пароль cPanel/SSH/FTP был виден на скриншоте — сменить его в cPanel **Password & Security**. Приватные ключи и пароли не помещать в Git, чат, логи или файлы сайта.

## 1. Хостинг
Проверить, что корень сайта действительно `/home/geodigit/public_html`, что SSH на `178.172.217.166:1288` работает и что на сервере установлен `rsync`.
HostFly сообщил, что AutoSSL обновился; пользователь проверил `curl.exe -I https://geodigital.by/` без ошибки TLS: HTTP/1.1 200 OK, LiteSpeed, исходная стартовая страница 12467 байт. Нужна финальная проверка сертификата и PWA после релиза.
Настройки `.htaccess` в этой ветке добавляют HTTP-заголовки для `sw.js` и PWA. Перед включением первого релиза проверить совместимость с настройками Apache/HostFly и файлом `.htaccess` на сервере.
Резервные копии заменяемых `index.html`, `sw.js`, `.htaccess` сохраняются вне публичного каталога в `~/hostfly-deploy-backups/`.
`rsync` не использует `--delete`; старые лишние файлы могут остаться. Нельзя считать схему атомарной до отдельной проверки возможности версионных каталогов.

## 2. SSH-ключ только для деплоя (Windows PowerShell)
На доверенном локальном компьютере:
```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\geodigital_actions" -C "geodigital-gh-actions" -N ""
Get-Content "$env:USERPROFILE\.ssh\geodigital_actions.pub"
```
Добавить **только публичный ключ** (`.pub`) в cPanel → SSH Access → Manage SSH Keys → Import Key, затем **Authorize**. Приватный ключ остаётся у владельца до помещения в GitHub Environment secret. Не отправлять его в чат.
Перед проверкой SSH получить у HostFly отпечаток ключа сервера альтернативным доверенным способом и сверить с полученным из `ssh-keyscan -p 1288 178.172.217.166`. Заполнить известные хосты только после сверки.

Локальная проверка:
```powershell
ssh -p 1288 -i "$env:USERPROFILE\.ssh\geodigital_actions" geodigit@178.172.217.166
```
На сервере проверить `command -v rsync` и `test -d /home/geodigit/public_html`. Не вводить команды удаления.

## 3. GitHub
Environment `hostfly-production` уже создано, оба SSH-секрета добавлены. **Deployment branches and tags:** разрешена ровно одна ветка `deploy/hostfly`; подлинность сервера подтверждена HostFly. Успешно выполнены сборка, визуальные регрессии и read-only SSH job на публикационной ветке (Actions run `42887119723`).

Environment secrets:
- `HOSTFLY_SSH_PRIVATE_KEY` — содержимое локального файла `geodigital_actions` (не `.pub`).
- `HOSTFLY_SSH_KNOWN_HOSTS` — проверенная строка `[178.172.217.166]:1288 ssh-ed25519 ...` (может отличаться по типу алгоритма).

Repository Actions variables (уровень репозитория, **не Environment**):
- `HOSTFLY_DEPLOY_ENABLED` = `false` (оставить, пока SSL/SSH не готовы). GitHub вычисляет `jobs.publish.if` до получения environment variables, поэтому переключатель должен находиться в Repository variables. Переменная с тем же названием, добавленная в Environment, не заменяет этот переключатель.

Environment variables (доступны внутри шагов publish):
- `HOSTFLY_SSH_HOST` = `178.172.217.166`
- `HOSTFLY_SSH_PORT` = `1288`
- `HOSTFLY_SSH_USER` = `geodigit`
- `HOSTFLY_REMOTE_DIR` = `/home/geodigit/public_html` (после проверки)
- `HOSTFLY_SITE_URL` = `https://geodigital.by`

Workflow `.github/workflows/deploy-hostfly.yml` выполняет проверки на PR в `deploy/hostfly`. Публикация при `push` в `deploy/hostfly` разрешена только если `HOSTFLY_DEPLOY_ENABLED=true`; эта Repository Variable по умолчанию остаётся `false`. **Для разового выпуска** можно запустить Actions → workflow → Run workflow → выбрать ветку `deploy/hostfly` и поставить `publish=true`; только явный ручной запуск публикует при `HOSTFLY_DEPLOY_ENABLED=false`. Во всех случаях сначала идут полные тесты, затем backup/rsync/HTTPS-проверка. GitHub Default branch теперь `deploy/hostfly`; устаревшую `main` не сливать.

## 4. Проверка SSH до публикации
При `HOSTFLY_DEPLOY_ENABLED=false` специальное задание `ssh-check` запускается **только на push в доверенную `deploy/hostfly` после успешных тестов**. Оно использует environment secrets и проверенный known_hosts, читает путь и наличие rsync, ничего на HostFly не записывает. На pull_request это задание не получает секреты и не запускается. Черновой PR не сливать до готовности тестов и настройки ограничений environment. Пользователь подтвердил отключение интеграции Netlify.

## 5. Проверка результата
После релиза проверить живой `https://geodigital.by/sw.js`, `/globus/belarus-view.js`, `/works/9/3/index.html`, обе темы, RU/BE/EN, мобильные размеры, Беларусь 75% карты, PWA-установку и офлайн.
При ошибке workflow не утверждать, что сайт опубликован, пока HTTP/визуальная проверка не прошла. Для отката использовать проверенный архив прошлого релиза и отдельный согласованный процесс.

## 6. Отключение Netlify
Владелец проекта подтвердил отключение GitHub-связи и автопубликации Netlify. Конфигурация `netlify.toml` удалена из релизного PR, а хостинг-специфические вставки удалены из встроенного глобуса. Старую ветку `deploy/netlify` пока не удалять до завершения первого подтверждённого релиза с HostFly; затем можно архивировать как историческую. GitHub default branch пока `main` (устаревшая): default branch изменена пользователем на `deploy/hostfly`; `workflow_dispatch` доступен на актуальном коде.
