/**
 * Sends an email using the Gmail API via the user's access token.
 */
export async function sendGmailEmail({
  accessToken,
  to,
  subject,
  html
}: {
  accessToken: string;
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    // Gmail API requires the email to be a base64url encoded RFC 2822 message
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const message = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      html
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Gmail API Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send Gmail email:', error);
    return false;
  }
}
