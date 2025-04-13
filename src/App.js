import React, { useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function MandateFormFiller() {
  const [name, setName] = useState('');
  const [signatureFile, setSignatureFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    setPdfFile(file);
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    setSignatureFile(file);
  };

  const generatePDF = async () => {
    if (!pdfFile || !signatureFile || !name) {
      alert('Please provide all inputs (PDF, Name, Signature)');
      return;
    }
  
    try {
      // Load the original PDF
      const pdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
  
      // Add a font for name (use built-in fonts)
      const pages = pdfDoc.getPages();
      const mandateType = pdfFile.name.includes("NJ") ? 'NJ' : 'NSE';
      const firstPage = pages[0];
  
      // Add the name
      firstPage.drawText(name, {
        x: 192,
        y: 492,
        size: name.length <= 20 ? 12 : name.length <= 30 ? 10 : 8,
        color: rgb(0, 0, 0),
      });
  
      // Read the signature image
      const reader = new FileReader();
      reader.onload = async () => {
        const signatureDataUrl = reader.result;
        const signatureType = signatureFile.type; // e.g., 'image/png', 'image/jpeg'
  
        let signatureImage;
        if (signatureType === 'image/png') {
          signatureImage = await pdfDoc.embedPng(signatureDataUrl);
        } else if (signatureType === 'image/jpeg') {
          signatureImage = await pdfDoc.embedJpg(signatureDataUrl);
        } else {
          alert('Unsupported signature format! Please use PNG or JPEG.');
          return;
        }

        // Define the box dimensions (replace with exact dimensions of your box)
        const boxWidth = 130; // Example width
        const boxHeight = 35; // Example height
  
        // Scale the image to fit within the box
        const scaledDimensions = signatureImage.scale(
          Math.min(boxWidth / signatureImage.width, boxHeight / signatureImage.height)
        );
  
        // Add the signature to the PDF
        firstPage.drawImage(signatureImage, {
          x: 200,
          y: 520,
          width: scaledDimensions.width,
          height: scaledDimensions.height,
        });
  
        // Save the modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        // Convert PDF to Image
        const pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        const pdfUrl = URL.createObjectURL(pdfBlob);

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        loadingTask.promise.then(async (pdf) => {
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 4 });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;


          // Convert canvas to image
          const imageUrl = canvas.toDataURL('image/jpeg', 1.0);
          const a = document.createElement('a');
          a.href = imageUrl;
          a.download = `${name}_${mandateType}.jpg`;
          a.click();

          // Cleanup
          URL.revokeObjectURL(pdfUrl);
        });
      };
  
      reader.readAsDataURL(signatureFile);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Check console for details.');
    }
  };
  

  const styles = {
    container: {
      maxWidth: '500px',
      margin: '0 auto',
      padding: '30px',
      backgroundColor: '#f9f9f9',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      fontFamily: 'Arial, sans-serif',
    },
    header: {
      textAlign: 'center',
      color: '#333',
      marginBottom: '30px',
      fontSize: '24px',
      fontWeight: 'bold',
    },
    inputContainer: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '10px',
      color: '#555',
      fontWeight: '600',
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'border-color 0.3s ease',
    },
    fileInput: {
      display: 'none',
    },
    fileInputLabel: {
      display: 'block',
      padding: '12px',
      backgroundColor: '#f0f0f0',
      border: '2px dashed #ccc',
      borderRadius: '8px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
    },
    button: {
      width: '100%',
      padding: '15px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '18px',
      cursor: 'pointer',
      transition: 'background-color 0.3s ease',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Mandate Form Filler</div>

      <div style={styles.inputContainer}>
        <label style={styles.label}>Upload Original PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handlePdfUpload}
          style={styles.fileInput}
          id="pdf-upload"
        />
        <label htmlFor="pdf-upload" style={styles.fileInputLabel}>
          {pdfFile ? pdfFile.name : 'Select PDF File'}
        </label>
      </div>

      <div style={styles.inputContainer}>
        <label style={styles.label}>Name as per Bank Records</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
          placeholder="Enter Full Name"
        />
      </div>

      <div style={styles.inputContainer}>
        <label style={styles.label}>Upload Signature</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleSignatureUpload}
          style={styles.fileInput}
          id="signature-upload"
        />
        <label htmlFor="signature-upload" style={styles.fileInputLabel}>
          {signatureFile ? signatureFile.name : 'Select Signature Image'}
        </label>
      </div>

      <button
        onClick={generatePDF}
        style={styles.button}
        disabled={!pdfFile || !signatureFile || !name}
      >
        Generate Mandate Image
      </button>
    </div>
  );
}

export default MandateFormFiller;
