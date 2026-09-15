# AUTOMATIZADOR DE PROMOCIONES — Netlify

## Despliegue recomendado
1. Sube este proyecto a GitHub (los archivos de este directorio deben quedar en la raíz del repositorio).
2. En Netlify: Add new project → Import an existing project → GitHub.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Node: `20`
6. Environment variable:
   `VITE_GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/1Cxz7VFqJbFmQRgpugypwdXaz_AWOP1ZnZ-NX2WcF0XM/export?format=csv&gid=0`
7. Deploy.

Si la hoja es privada, usa `GOOGLE_SHEETS_URL` en Netlify para la función `/\.netlify/functions/products` y no expongas credenciales en `VITE_*`.
