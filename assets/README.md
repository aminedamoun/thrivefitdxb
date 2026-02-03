# Assets Folder

This folder contains all the customizable images and logos for your SportCoach Dubai website.

## Folder Structure

```
assets/
├── images/
│   └── hero-background.jpg  (Background image for the coming soon page)
├── logos/
│   └── logo.svg  (Main logo - currently using inline SVG, can be replaced)
└── README.md (This file)
```

## How to Change Images and Logos

### Changing the Hero Background Image

1. **Replace the image file:**
   - Navigate to `assets/images/`
   - Replace `hero-background.jpg` with your own image
   - **Important:** Keep the same filename OR update the reference in `pages/landing_page.html`

2. **Supported formats:** JPG, PNG, WebP, SVG
3. **Recommended size:** 1920x1080px or higher for best quality

### Changing the Logo

1. **Replace the logo file:**
   - Navigate to `assets/logos/`
   - Replace `logo.svg` with your own logo
   - **Important:** Keep the same filename OR update the reference in `pages/landing_page.html`

2. **Supported formats:** SVG (recommended), PNG (with transparent background)
3. **Recommended size:** 64x64px for SVG, 128x128px for PNG

### Quick Reference: Update Image Paths

After replacing files, if you used different filenames, update these lines in `pages/landing_page.html`:

**For background image:**
```html
<img src="../assets/images/your-new-image.jpg" alt="...">
```

**For logo (if using image file instead of SVG):**
```html
<img src="../assets/logos/your-new-logo.svg" alt="SportCoach Dubai Logo" width="64" height="64">
```

## Best Practices

1. **Use descriptive filenames** (e.g., `hero-sports-action.jpg` instead of `img1.jpg`)
2. **Optimize images** before uploading to improve page load speed
3. **Keep aspect ratios** consistent with the original images
4. **Use SVG format** for logos for best quality at any size
5. **Test your changes** in the browser after updating

## Need Help?

- Background image is located at: `assets/images/hero-background.jpg`
- Logo is located at: `assets/logos/logo.svg`
- Update references in: `pages/landing_page.html`

Happy customizing! 🚀