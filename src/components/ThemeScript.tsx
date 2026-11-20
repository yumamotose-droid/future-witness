/**
 * Applies the stored appearance before first paint so the record does not flash
 * from paper to ink. Inlined deliberately: a round trip here is visible.
 */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem("future-witness/theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
