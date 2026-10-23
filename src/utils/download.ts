export function downloadFile(content: string | Uint8Array, filename: string, type: string) {
  const data = typeof content === 'string' ? content : new Uint8Array(content);
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
