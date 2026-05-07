function slugify(text = "") {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-");
}

module.exports = slugify;