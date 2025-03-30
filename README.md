
# 🎯 Lead Tracking Function (Meta + Reddit)

## Features
- Secure CAPI calls for Meta via Stape
- Secure Reddit Conversions API call
- SHA256 hashed emails
- Serverless-ready for Netlify
- Use with Carrd via POST + OnSubmit JS

## Setup
1. Copy `.env.sample` → `.env` and fill in your secrets
2. Install: `npm install`
3. Test or deploy to Netlify
4. Carrd form "On Submit":
```js
(async () => {
  const email = this.querySelector('[name="email"]').value;
  if (!email) return;
  await fetch("https://your-site.netlify.app/.netlify/functions/track-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
})();
```
