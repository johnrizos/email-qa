// A newsletter with the kind of mistakes that slip into real sends.
export const SAMPLE_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="https://fonts.example.com/brand.css">
  <style>
    .row { display: flex; gap: 16px; }
    @media (prefers-color-scheme: dark) {
      body { background: #111; color: #eee; }
    }
  </style>
</head>
<body style="margin:0; background:#f4f4f7; font-family:Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="600" style="background:#ffffff;">
          <tr>
            <td style="padding:24px;">
              <img src="images/logo.png" width="120">
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px;">
              <h1 style="font-size:24px;">Your autumn picks are here</h1>
              <p>Hand-picked for you, %%first_name%%. Free shipping until Sunday.</p>
              <div class="row">
                <img src="https://picsum.photos/id/1080/260/180" alt="Autumn fruit" width="260">
                <img src="http://picsum.photos/id/292/260/180" width="260">
              </div>
              <p style="text-align:center; padding:24px 0;">
                <a href="#" style="background:#4f46e5; color:#fff; padding:12px 24px; text-decoration:none; border-radius:6px;">Shop the collection</a>
              </p>
              <form action="https://example.com/subscribe"><input type="email" name="email"></form>
            </td>
          </tr>
          <tr>
            <td style="padding:24px; font-size:12px; color:#6b7280;">
              You are receiving this because you subscribed.
              <a href="%%unsubscribe%%">Unsubscribe</a> ·
              <a href="/preferences">Preferences</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
