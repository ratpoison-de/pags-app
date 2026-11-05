/**
 * PAGS Graduierung – Mailversand
 * Empfängt die Selbstbewertung von graduierung/index.html und schickt das PDF per Mail.
 *
 * Einrichtung (einmalig, ca. 3 Minuten):
 * 1. https://script.google.com → „Neues Projekt“ → diesen Code komplett einfügen → speichern.
 * 2. Oben Funktion „test“ auswählen → „Ausführen“ → Zugriff erlauben.
 *    (Hinweis „Google hat diese App nicht überprüft“ → „Erweitert“ → „Zu … wechseln (unsicher)“ → „Zulassen“)
 *    Es kommt eine Testmail an.
 * 3. „Bereitstellen“ → „Neue Bereitstellung“ → Typ „Web-App“
 *    Ausführen als: „Ich“ · Zugriff: „Jeder“ → „Bereitstellen“.
 * 4. Die Web-App-URL (endet auf /exec) kopieren.
 */
const EMPFAENGER = 't.von.plotho-kettner@pagskuelsheim.de';
const TOKEN = 'pags-graduierung';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.token !== TOKEN) return antwort({ ok: false, fehler: 'Zugriff verweigert' });
    const pdf = Utilities.newBlob(Utilities.base64Decode(d.pdf), 'application/pdf', d.dateiname);
    const esc = s => String(s || '–').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const html =
      '<h2 style="color:#A81010">Selbstbewertung ' + esc(d.stufe) + '</h2>' +
      '<p><b>Name:</b> ' + esc(d.name) + '<br><b>Datum:</b> ' + esc(d.datum) +
      '<br><b>Punkte (selbst):</b> ' + esc(d.punkte) + '</p>' +
      '<ul>' + (d.einzel || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      '<p><b>Dienste:</b> ' + esc(d.dienste) + '</p>' +
      '<p><b>Bemerkung:</b> ' + esc(d.bemerkung) + '</p>' +
      '<p style="color:#777;font-size:12px">Das PDF hängt an.</p>';
    MailApp.sendEmail({
      to: EMPFAENGER,
      subject: String(d.betreff || 'Selbstbewertung').slice(0, 200),
      htmlBody: html,
      attachments: [pdf],
      name: 'PAGS Graduierung'
    });
    return antwort({ ok: true });
  } catch (err) {
    return antwort({ ok: false, fehler: String(err) });
  }
}

function doGet() {
  return antwort({ ok: true, info: 'PAGS Graduierung – Mailversand läuft' });
}

function antwort(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function test() {
  MailApp.sendEmail(EMPFAENGER, 'PAGS Graduierung – Test', 'Der Mailversand ist eingerichtet.');
}
