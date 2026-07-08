// İçerik (blog) ekranları barrel (Wave 5c).
//
// BlogArchiveScreen — route `blog` (registry sahibi Wave 6 eşler). BlogDetailView — `.blog(slug)`
// OVERLAY: prop almaz, overlay slug'ını kendi okur; Wave 6 AppShell.DetailOverlaySlot'a takar.

export { BlogArchiveScreen } from './BlogArchiveScreen';
export { BlogDetailView } from './BlogDetailView';

// Saf filtre yardımcıları (test edilebilir).
export { BLOG_CATEGORY_CHIPS, blogChipLabel, filterBlogs } from './blogArchiveFilter';
