```javascript
// =====================================
// 5B MARKETPLACE - SUPABASE CONNECTION
// =====================================

window.SUPABASE_URL = "https://uprzldotdbktahfwwaqk.supabase.co";

window.SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_PUBLIC_KEY_HERE";

// Initialize Supabase
window.db = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
);

console.log("5B Supabase connection initialized.");
```