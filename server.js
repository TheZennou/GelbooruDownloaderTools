const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3014;

app.use(cors());
app.use(express.json());

app.post('/download', async (req, res) => {
    const { url, fileName, downloadLocation } = req.body;
    
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        // Use the downloadLocation as a subfolder inside ./output/
        const fullPath = path.join(__dirname, 'output', downloadLocation, fileName);
        const dir = path.dirname(fullPath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const writer = fs.createWriteStream(fullPath);
        response.data.pipe(writer);

        writer.on('finish', () => {
            console.log(`Image downloaded successfully: ${fullPath}`);
            res.json({ success: true, message: 'File downloaded successfully' });
        });

        writer.on('error', () => {
            res.status(500).json({ success: false, message: 'Error writing file' });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error downloading file' });
    }
});

app.post('/downloadTags', (req, res) => {
    const { tags, fileName, downloadLocation } = req.body;
    
    try {
        // Use the downloadLocation as a subfolder inside ./output/
        const fullPath = path.join(__dirname, 'output', downloadLocation, fileName);
        const dir = path.dirname(fullPath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFile(fullPath, tags, (err) => {
            if (err) {
                res.status(500).json({ success: false, message: 'Error writing tags file' });
            } else {
                console.log(`Tags file created successfully: ${fullPath}`);
                res.json({ success: true, message: 'Tags file created successfully' });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating tags file' });
    }
});

app.listen(port, () => {
    console.log(`Download server listening at http://localhost:${port}`);
});