const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const un = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
document.getElementById('gen').addEventListener('click', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  const pub = new Uint8Array(65); pub[0] = 4; pub.set(un(jwk.x), 1); pub.set(un(jwk.y), 33);
  document.getElementById('pub').value = b64u(pub); document.getElementById('priv').value = jwk.d;
  document.getElementById('out').hidden = false;
});
document.addEventListener('click', async (e) => {
  const id = e.target.dataset?.copy; if (!id) return;
  const el = document.getElementById(id); el.select();
  try { await navigator.clipboard.writeText(el.value); document.getElementById('msg').textContent = 'Copied.'; } catch { document.getElementById('msg').textContent = 'Press and hold the text to copy.'; }
});
