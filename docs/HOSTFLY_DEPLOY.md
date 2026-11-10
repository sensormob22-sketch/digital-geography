# HostFly: безопасная подготовка релизов

Домен: geodigital.by. Основная ветка кода: `deploy/netlify`.
Действующий Netlify не изменяется. Новый workflow сохраняет прежние тесты, собирает все локальные геоданные и не публикует ничего до включения защиты.

## 0. Безопасность
Если пароль cPanel/SSH/FTP был виден на скриншоте — сменить его в cPanel **Password & Security**. Приватные ключи и пароли не помещать в Git, чат, логи или файлы сайта.

## 1. Хостинг
Проверить, что корень сайта действительно `/home/geodigit/public_html`, что SSH на `178.172.217.166:1288` работает и что на сервере установлен `rsync`.
Проверить действительный HTTPS (пока AutoSSL показывает `unmanaged`, публикация должна оставаться выключенной).
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
Создать Environment `hostfly-production` с обязательным подтверждением, если доступно на текущем плане/типе репозитория.

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

Workflow `.github/workflows/deploy-hostfly.yml` выполняет проверки на PR в `deploy/netlify`, а на push в `deploy/netlify` публикует лишь при `HOSTFLY_DEPLOY_ENABLED=true`. Ручной `workflow_dispatch` требует наличия workflow также в default branch GitHub; **не сливать устаревшую `main` в `deploy/netlify`**.

## 4. Проверка результата
После релиза проверить живой `https://geodigital.by/sw.js`, `/globus/belarus-view.js`, `/works/9/3/index.html`, обе темы, RU/BE/EN, мобильные размеры, Беларусь 75% карты, PWA-установку и офлайн.
При ошибке workflow не утверждать, что сайт опубликован, пока HTTP/визуальная проверка не прошла. Для отката использовать проверенный архив прошлого релиза и отдельный согласованный процесс.
