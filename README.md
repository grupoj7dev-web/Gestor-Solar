# API Solarman (Node.js)

API REST em Node.js para integrar com o International Data Center (`https://globalapi.solarmanpv.com`). Inclui obtenção e cache de token, e rotas para listar usinas, obter dados em tempo real e históricos de estações e dispositivos.

## Variáveis de ambiente

- `SOLARMAN_BASE_URL` (default `https://globalapi.solarmanpv.com`)
- `SOLARMAN_APP_ID`
- `SOLARMAN_APP_SECRET`
- `SOLARMAN_ORG_ID` (opcional)
- `SOLARMAN_EMAIL` ou `SOLARMAN_MOBILE` ou `SOLARMAN_USERNAME`
- `SOLARMAN_PASSWORD` (será enviado em SHA256)
- `SOLARMAN_TOKEN_CACHE` (default `var/token.json`)
- `PORT` (default `3000`)

## Instalação

```bash
npm install
```

## Execução

```bash
npm start
```

## Fluxo de autenticação

- Obter token em `POST /auth/token` (usa `2.1 account/v1.0/token?appId=...`)
- Token é armazenado em `var/token.json` com validade aproximada de 55 dias. Se expirar, é renovado automaticamente.

## Rotas

- `POST /auth/token`
  - Obtém e salva novo token.
- `GET /stations?page=1&size=20`
  - Lista usinas (`station/v1.0/list`).
- `GET /stations/:stationId/realtime`
  - Dados em tempo real da usina (`station/v1.0/realTime`).
- `GET /stations/:stationId/devices?deviceType=INVERTER|COLLECTOR|MICRO_INVERTER&page=1&size=10`
  - Lista dispositivos da usina (`station/v1.0/device`).
- `POST /stations/history`
  - Histórico da usina (`station/v1.0/historical`). Corpo conforme documentação oficial.
- `POST /stations/:stationId/alarms`
  - Lista de alarmes da usina (`station/v1.0/alarmList`). Corpo conforme documentação oficial.
- `POST /devices/current`
  - Dados atuais do equipamento (`device/v1.0/currentData`). Ex.: `{ "deviceSn": "..." }`.
- `POST /devices/history`
  - Histórico do equipamento (`device/v1.0/historical`). Corpo conforme documentação oficial.
- `POST /devices/alarms/detail`
  - Detalhe de alarme do equipamento (`device/v1.0/alarmDetail`).

## Observações importantes

- `appId` é passado como query e `appSecret`, identidade (email/mobile/username) e `password` (SHA256) no corpo JSON.
- Em ambiente Business, inclua `orgId` no corpo para emitir token de organização.
- Use sempre o domínio internacional: `globalapi.solarmanpv.com`.
- Não versionar `.env` e `var/token.json` (estão no `.gitignore`).

## Referências de endpoints

- Token: `POST https://globalapi.solarmanpv.com/account/v1.0/token?appId=APPID&language=en`
- Estações (lista): `POST https://globalapi.solarmanpv.com/station/v1.0/list?language=en`
- Estações (tempo real): `POST https://globalapi.solarmanpv.com/station/v1.0/realTime?language=en`
- Dispositivos da estação: `POST https://globalapi.solarmanpv.com/station/v1.0/device?language=en`
- Dispositivo (dados atuais): `POST https://globalapi.solarmanpv.com/device/v1.0/currentData?language=en`
- Dispositivo (histórico): `POST https://globalapi.solarmanpv.com/device/v1.0/historical?language=en`
- Estação (histórico): `POST https://globalapi.solarmanpv.com/station/v1.0/historical?language=en`
- Estação (alarmes): `POST https://globalapi.solarmanpv.com/station/v1.0/alarmList?language=en`
- Dispositivo (detalhe de alarme): `POST https://globalapi.solarmanpv.com/device/v1.0/alarmDetail?language=en`

## Exemplos

- Obter token:

```bash
curl -X POST http://localhost:3000/auth/token
```

- Listar estações:

```bash
curl "http://localhost:3000/stations?page=1&size=10"
```

- Dados em tempo real da estação:

```bash
curl "http://localhost:3000/stations/123456/realtime"
```

- Listar dispositivos da estação:

```bash
curl "http://localhost:3000/stations/123456/devices?deviceType=INVERTER"
```

- Dados atuais do dispositivo:

```bash
curl -X POST http://localhost:3000/devices/current \
  -H "Content-Type: application/json" \
  -d '{"deviceSn": "INVERTER_SN"}'
```

- Histórico do dispositivo:

```bash
curl -X POST http://localhost:3000/devices/history \
  -H "Content-Type: application/json" \
  -d '{"deviceSn":"INVERTER_SN","startTime":1700000000,"endTime":1700086400}'
```

## Execu��o manual (Windows CMD)

Use 2 terminais `cmd` para rodar backend e frontend juntos.

1. Abra o projeto:

```cmd
cd /d D:\j7-sistemas\gestor solar
```

2. Instale depend�ncias (se necess�rio):

```cmd
npm install
npm --prefix web install
```

3. Terminal 1 - Backend (API):

```cmd
cd /d D:\j7-sistemas\gestor solar
npm start
```

4. Terminal 2 - Frontend (Web):

```cmd
cd /d D:\j7-sistemas\gestor solar
npm --prefix web run dev
```

5. URLs de acesso:

- Frontend: `http://localhost:4000`
- Health API: `http://localhost:4001/api/health`

6. Build do frontend (opcional):

```cmd
cd /d D:\j7-sistemas\gestor solar
npm --prefix web run build
```
