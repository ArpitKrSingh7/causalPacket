# CausalPacket visual assets

Original logo and illustration generated with the built-in OpenAI image-generation tool, then resized/encoded with FFmpeg. These are decorative brand assets, not analyzed network evidence. No external image request is made at runtime.

- `packet-lens.webp`: original 3D packet-inspection artwork, 1200 × 800, about 45 KB.
- `packet-mark.webp`: original transparent packet/branch symbol, 192 × 192.
- App icons: `../../app/favicon.ico`, `../../app/icon.png`, `../../app/apple-icon.png`, derived from the same generated mark. Transparency is preserved.
- Typography: locally hosted Manrope and Space Grotesk, downloaded from the official [Google Fonts source repository](https://github.com/google/fonts). Font files and SIL Open Font License notices are in `../../app/fonts/`. Browsers do not contact Google Fonts.

## Final generation prompts

**Illustration**

> Use case: stylized-concept. Asset type: original website illustration for CausalPacket, a network investigation tool. Create a refined sculptural editorial 3D artwork, landscape 3:2 composition. A floating stack of thin translucent frosted-glass packet cards with fine etched connection paths, passing through a precise orange circular inspection lens. One path branches into two possibilities, with little cobalt nodes and a single vivid orange packet. Feels like a designed scientific instrument photographed in a calm studio, tactile glass and soft matte porcelain, pale cool-gray background #f2f3f5, cobalt blue #2457ff, fluorescent orange #ff5b35, deep ink details. Isometric perspective, expressive but restrained, strong depth and subtle shadows. Entire object comfortably within frame with margin, isolated composition. This is decorative brand artwork, not a data chart. No text, no letters, no labels, no UI, no shields, no locks, no hooded people, no binary code, no watermark, no busy glowing cyberpunk.

**Logo and favicon master**

> Use case: logo-brand. Asset type: original standalone brand symbol for CausalPacket, to become its website logo and favicon. Design one exceptionally simple, bold geometric symbol: a squared packet outline with rounded corners, one clean route entering from the left and branching into two small square terminals on the right. A distinctive orange #ff5b35 symbol, flat vector-like edges, no gradients, no shadows, no thin strokes. Compact nearly square silhouette, centered with modest padding. It must remain legible at 16 pixels. Transparent background. Only one logo symbol, no wordmark, no typography, no mockups, no labels, no grid, no watermark, no shield or padlock. Sophisticated software brand, confident generous geometry.


## Social link preview

`social-preview.jpg` is the generated 1200 × 630 Open Graph/Twitter cover. It is served statically by Vercel and does not require the Render API to wake up. Created with the built-in image-generation tool, using the existing packet-lens illustration and packet mark as visual references; FFmpeg resized/encoded the selected output.

Final prompt:

> Use case: ads-marketing. Asset type: production Open Graph social link preview cover for the CausalPacket website, intended at exactly 1200 x 630 pixels, wide 1.91:1 landscape. Create a NEW cover composition using Image 1 as the illustration reference and Image 2 as the existing brand mark. Keep the visual identity: warm ivory #f5f5f2 background, deep ink #182336 typography, vivid orange brand accent and cobalt packet paths. Left half: the original small orange branching packet mark, then a very large clean geometric sans-serif wordmark reading exactly 'CausalPacket'. Below it, medium heading exactly 'Fault or Foe?' and a smaller supporting line exactly 'Follow the evidence.' Bottom-left small website address exactly 'causal-packet.vercel.app'. Right half: a beautiful sculptural frosted-glass packet stack passing through the orange inspection lens from Image 1, artfully framed, sharp and refined. Professional editorial software brand, generous space, precise alignment, readable on a mobile link card. All text and logo must stay inside a generous 9% safe margin. No dashboard screenshot, no fictitious findings, no statistics, no badge claiming security or accuracy, no extra words, no shields, no watermark. The image is decorative branding for a network investigation product.
