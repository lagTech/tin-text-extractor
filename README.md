# Tin Text Extractor

A web application that uses your device's camera to extract text from tin containers and maintains a list of unique extracted text entries.

## Features

- 📷 **Camera Integration**: Uses your device's camera to capture images of tin containers
- 🔍 **Enhanced OCR Text Extraction**: Advanced image preprocessing and multiple OCR attempts for better accuracy
- 📹 **Continuous Video Mode**: Automatically captures and extracts text every 2 seconds for seamless processing
- 📝 **Smart Duplicate Detection**: Prevents duplicate text entries with similarity checking
- 🎯 **Image Enhancement**: Automatic contrast adjustment and text optimization
- 💾 **Local Storage**: Saves extracted text locally in your browser
- 📤 **Export Functionality**: Export your text list as a JSON file
- 📱 **Mobile Responsive**: Works on both desktop and mobile devices
- 🎨 **Modern UI**: Beautiful, intuitive interface with real-time feedback

## How to Use

### Getting Started

1. **Open the Application**: Open `index.html` in a modern web browser
2. **Grant Camera Permissions**: When prompted, allow the app to access your camera
3. **Start Camera**: Click the "Start Camera" button to begin

### Extracting Text

#### Manual Mode:
1. **Position the Tin**: Hold your tin container in front of the camera, positioning it within the green capture frame
2. **Capture Image**: Click "Capture & Extract" to take a photo and extract text
3. **Review Results**: The extracted text will appear in the list on the right side
4. **Continue**: Repeat for additional tin containers

#### Continuous Mode (Recommended for Multiple Tins):
1. **Start Continuous Mode**: Click "Start Continuous Mode" button
2. **Show Tins**: Simply hold each tin container in front of the camera
3. **Automatic Processing**: The app will automatically capture and extract text every 2 seconds
4. **Smart Detection**: Only new or different text will be added to the list
5. **Stop When Done**: Click "Stop Continuous Mode" when finished

### Managing Your Text List

- **View Extracted Text**: All successfully extracted text appears in the list with timestamps
- **Remove Individual Items**: Click the "×" button next to any text item to remove it
- **Clear All**: Use the "Clear All" button to remove all extracted text
- **Export List**: Click "Export List" to download your text list as a JSON file

## Technical Details

### Requirements

- Modern web browser with camera support
- HTTPS connection (required for camera access in most browsers)
- Internet connection (for Tesseract.js OCR library)

### Browser Compatibility

- Chrome 53+
- Firefox 36+
- Safari 11+
- Edge 79+

### OCR Technology

The app uses [Tesseract.js](https://github.com/naptha/tesseract.js), a JavaScript library that provides OCR capabilities directly in the browser. It supports:

- English text recognition
- Automatic text cleaning and formatting
- Real-time processing

## File Structure

```
text_extractor/
├── index.html          # Main application file
├── styles.css          # Styling and layout
├── script.js           # Application logic
└── README.md           # This file
```

## Privacy & Security

- **Local Processing**: All text extraction happens locally in your browser
- **No Server Required**: No data is sent to external servers
- **Local Storage**: Extracted text is stored only in your browser's local storage
- **Camera Access**: Camera is only active when explicitly started and stopped

## Troubleshooting

### Camera Not Working
- Ensure you're using HTTPS (required for camera access)
- Check that your browser supports camera access
- Grant camera permissions when prompted
- Try refreshing the page and granting permissions again

### Text Not Extracting
- Ensure good lighting conditions
- Hold the tin container steady and clearly visible
- Make sure text is within the green capture frame
- Try adjusting the angle or distance from the camera

### Poor Text Recognition
- Improve lighting conditions
- Clean the tin container surface
- Ensure text is not blurry or distorted
- Try capturing from different angles

## Development

To modify or extend the application:

1. **Add New Features**: Edit `script.js` to add new functionality
2. **Modify Styling**: Update `styles.css` for visual changes
3. **Change OCR Settings**: Modify the Tesseract configuration in the `extractText` method

### Key Functions

- `startCamera()`: Initializes camera access
- `captureAndExtract()`: Captures image and triggers OCR
- `processExtractedText()`: Handles text processing and duplicate detection
- `saveTexts()`: Persists data to local storage

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please check the troubleshooting section above or create an issue in the project repository. 