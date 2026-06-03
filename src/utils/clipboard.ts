function fallbackCopyText(text: string) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'true');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textArea);

  if (!success) {
    throw new Error('Copy command failed');
  }
}

export async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Some embedded browsers expose Clipboard API but deny write access.
    }
  }

  fallbackCopyText(text);
}
