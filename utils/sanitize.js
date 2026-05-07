const sanitizeHtml = require("sanitize-html");

function cleanHtml(input) {
  if (!input) return input;

  return sanitizeHtml(input, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "blockquote",
      "a",
      "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}

function cleanText(input) {
  if (!input) return input;

  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

module.exports = {
  cleanHtml,
  cleanText,
};