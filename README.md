# EventCampaignSystem Frontend

Panel inicial para preparar campanas usando el backend `EventCampaignSystem`.

## Alcance actual

- Buscar contactos historicos.
- Filtrar por evento, ciudad, estado e iglesia.
- Crear borradores de campana.
- Escribir mensaje con variables sugeridas.
- Seleccionar imagenes, PDFs o archivos como adjuntos en borrador.
- Previsualizar destinatarios por filtro.
- Agregar destinatarios al borrador.

## Fuera de alcance por ahora

- No envia WhatsApp.
- No envia correo.
- No sube adjuntos al servidor.
- No tiene autenticacion todavia.

## Configuracion

Crear `.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:5001
```

Ejecutar:

```bash
npm install
npm run serve
```

Build:

```bash
npm run build
```
