# JINGOX — Wholesale Gaming Console Accessories

This repository contains the official product catalog website for **JINGOX**, a Shenzhen,
China-based source factory and trading partner for wholesale gaming console accessories —
charging docks, cooling stands, somatosensory kits, storage stands, faceplates, storage
bags and protective gear for Nintendo Switch 2, Nintendo Switch, PS5 / PS5 Slim / PS5 Pro,
PS4, Xbox Series X|S, and VR / Meta Quest.

## About this site

- **Pure static build**: HTML5 + CSS3 + vanilla JavaScript. No framework, no backend,
  no database, no shopping cart, checkout or online payment.
- **B2B inquiry model**: distributors, resellers and brand owners request a quote through a
  7-field inquiry form, WhatsApp, or email — there is no online checkout.
- **Catalog**: 108 models organized across 8 console platforms and 9 accessory categories,
  with a minimum order of one piece accepted.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home — value proposition, platform browse, categories, featured models |
| `products.html` | Full catalog with platform / category filters and search |
| `product.html` | Product detail template (renders `?sku=` dynamically) |
| `oem.html` | OEM / ODM customization services |
| `about.html` | Company profile |
| `contact.html` | Contact details and the 7-field inquiry form |
| `faq.html` | Frequently asked questions (FAQPage JSON-LD) |
| `blog.html` | Sourcing & wholesale guides |
| `privacy.html` / `terms.html` | Privacy policy and terms of service |
| `sitemap.xml` / `robots.txt` | Search engine discovery |

## Run locally

The site is fully static — any static file server works.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## SEO

- Unique title and meta description per page, semantic H1–H3, and image `alt` attributes.
- JSON-LD structured data for the organization (home / about) and the FAQ page.
- `sitemap.xml` and `robots.txt` are included for search engine submission.

## Contact

- Email: info@jingox.com
- Wholesale inquiries, OEM/ODM requests and samples are welcome.

## Trademarks

Nintendo, Switch, PlayStation, PS5, Xbox, Meta Quest and Steam Deck are trademarks of their
respective owners. JINGOX is an independent manufacturer and is not affiliated with,
sponsored by, or endorsed by these companies. All third-party names are used solely to
describe product compatibility.
