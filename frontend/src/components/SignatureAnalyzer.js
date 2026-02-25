import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Cropper from 'react-cropper';
import html2canvas from 'html2canvas'; // ✅ Naya Import
import 'cropperjs/dist/cropper.css'; 
import './SignatureAnalyzer.css';

const SignatureAnalyzer = () => {
  // --- States ---
  const [userName, setUserName] = useState('');
  
  // Doctor Photo States (For Cropping)
  const [doctorOriginal, setDoctorOriginal] = useState(null); 
  const [doctorCropped, setDoctorCropped] = useState(null);   
  const [showCropModal, setShowCropModal] = useState(false);  

  // Signature Photo State
  const [signatureImage, setSignatureImage] = useState(null); 
  
  // API and UI States
  const [analysisText, setAnalysisText] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({}); 
  const [copied, setCopied] = useState(false); 
  const [downloading, setDownloading] = useState(false); // ✅ Naya State download loader ke liye
  
  // Refs
  const cropperRef = useRef(null);
  const photoInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const resultCardRef = useRef(null); // ✅ Naya Ref Screenshot lene ke liye
  
  // Backend URL
  const API_BASE_URL = 'http://localhost:5000/api'; 

  useEffect(() => {
    if (showCropModal) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    // Cleanup function
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [showCropModal]);

  // --- 1. Handlers ---
  const handleNameChange = (e) => {
    setUserName(e.target.value);
    if (e.target.value.trim() !== '') {
      setErrors(prev => ({...prev, userName: null}));
    }
  };

  // --- 2. Doctor Photo Upload & Crop Logic ---
  const handlePhotoChange = (e) => {
    setAnalysisText('');
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({...prev, photo: 'Please upload a valid image.'}));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setDoctorOriginal(reader.result);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; 
  };

  const closeCropModal = () => {
    setShowCropModal(false);
    setDoctorOriginal(null);
  };

  const handleCrop = () => {
    if (cropperRef.current && cropperRef.current.cropper) {
      const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas({
        width: 512,
        height: 512,
      });
      setDoctorCropped(croppedCanvas.toDataURL('image/png'));
      setErrors(prev => ({...prev, photo: null})); 
      setShowCropModal(false); 
    }
  };

  // --- 3. Signature Upload Logic (No Crop Needed) ---
  const handleSignatureChange = (e) => {
    setAnalysisText('');
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({...prev, signature: 'Please upload a valid image.'}));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSignatureImage(reader.result);
        setErrors(prev => ({...prev, signature: null}));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // --- 4. Validation ---
  const validateForm = () => {
    let newErrors = {};
    let isValid = true;

    if (!userName.trim()) {
        newErrors.userName = "Doctor Name is required";
        isValid = false;
    }
    if (!doctorCropped) {
        newErrors.photo = "Please upload and crop Doctor Photo";
        isValid = false;
    }
    if (!signatureImage) {
        newErrors.signature = "Please upload Signature Photo";
        isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // --- 5. API Generation Call ---
  const generateAnalysis = async () => {
    if (!validateForm()) return; 

    setLoading(true);
    setAnalysisText('');
    setCopied(false);

    try {
      const userInfo = {
        userAgent: navigator.userAgent,
        userIp: 'user-' + Date.now() 
      };

      // ✅ Backend me signatureImage (image) aur doctorCropped (doctorImage) dono bhej rahe hain
      const response = await axios.post(`${API_BASE_URL}/images/generate`, {
        image: signatureImage, 
        doctorImage: doctorCropped, // Naya field add kiya
        userName: userName, 
        ...userInfo
      });

      if (response.data.success) {
        setAnalysisText(response.data.analysisText); 
      } else {
        setErrors(prev => ({...prev, api: response.data.message || 'Failed to analyze signature.'}));
      }
    } catch (err) {
      console.error('Generation error:', err);
      setErrors(prev => ({...prev, api: 'Server connection failed.'}));
    } finally {
      setLoading(false);
    }
  };

  // --- 6. Helper Functions ---
  const copyToClipboard = () => {
    if (analysisText) {
      navigator.clipboard.writeText(analysisText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); 
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  };

  // ✅ NAYA FUNCTION: Report ko Image banakar download karne ke liye
  const downloadReportImage = async () => {
    if (!resultCardRef.current) return;
    setDownloading(true);
    
    try {
      // html2canvas se screenshot lena
      const canvas = await html2canvas(resultCardRef.current, {
        scale: 2, // High quality image ke liye
        useCORS: true, // Images ko theek se render karne ke liye
        backgroundColor: "#ffffff",
        windowWidth: 1200, // ✅ NAYA: Isse mobile me bhi desktop jaisa layout banega
        onclone: (clonedDoc) => {
          const clonedCard = clonedDoc.querySelector('.split-result-card');
          if (clonedCard) {
            // Animation fix
            clonedCard.style.animation = 'none';      
            clonedCard.style.opacity = '1';           
            clonedCard.style.transform = 'none';      
            
            // ✅ Scrolling Fix: Taaki lamba text kate nahi, pura photo me aaye
            clonedCard.style.maxHeight = 'none';
            clonedCard.style.overflow = 'visible';
            
            // Right column ka scroll hatana
            const rightCol = clonedCard.querySelector('.result-right-column');
            if (rightCol) {
                rightCol.style.overflow = 'visible';
            }
            
            // Text wrapper ka scroll hatana
            const textWrapper = clonedCard.querySelector('.text-result-wrapper');
            if (textWrapper) {
                textWrapper.style.maxHeight = 'none';
                textWrapper.style.overflow = 'visible';
            }
          }
        }
      });
      
      const image = canvas.toDataURL("image/png");
      
      // Download trigger karna
      const link = document.createElement('a');
      link.href = image;
      link.download = `Signature_Analysis_${userName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading image:", err);
      alert("Failed to download image. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const closeResult = () => {
      setAnalysisText('');
  }

  const resetAll = () => {
    setDoctorCropped(null);
    setSignatureImage(null);
    setAnalysisText('');
    setUserName('');
    setErrors({});
  };

  return (
    <div className="signature-app-wrapper">
      
      <div className="form-card">
        
        {/* Header Section */}
        <div className="brand-header-section">
            <h2 className="main-title">AI Signature Analyzer</h2>
            <p className="brand-slogan">"Discover personality attributes instantly"</p>
        </div>

        <div className="form-content-wrapper">
            
            {/* 1. Name Input Section */}
            <div className="input-section">
                <label className="label-text">Doctor Name:</label>
                <input 
                    type="text" 
                    className={`custom-text-input ${errors.userName ? 'is-invalid-custom' : ''}`} 
                    placeholder="Enter Doctor's Name" 
                    value={userName}
                    onChange={handleNameChange}
                />
                {errors.userName && <div className="error-msg">{errors.userName}</div>}
            </div>

            {/* 2. Doctor Photo Upload Section */}
            <div className="upload-section mt-4">
                <label className="label-text">Upload Doctor Photo:</label>
                {!doctorCropped ? (
                    <label className={`file-wrap ${errors.photo ? 'file-wrap-error' : ''}`}>
                        <div className="file-upload-design">
                            <div className="upload-icon">
                                <i className="fas fa-user-md"></i>
                            </div>
                            <p>Click to Upload Doctor Photo</p>
                            <p className="upload-instruction-text">"Please crop the face clearly."</p>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            ref={photoInputRef}
                        />
                    </label>
                ) : (
                    <div className="preview-circle-container">
                        <img src={doctorCropped} alt="Doctor Preview" className="square-preview" />
                        <button className="btn-remove" onClick={() => setDoctorCropped(null)}>
                            &times; Change Photo
                        </button>
                    </div>
                )}
                {errors.photo && <div className="error-msg text-center">{errors.photo}</div>}
            </div>

            {/* 3. Signature Photo Upload Section */}
            <div className="upload-section mt-4">
                <label className="label-text">Upload Signature Photo:</label>
                {!signatureImage ? (
                    <label className={`file-wrap ${errors.signature ? 'file-wrap-error' : ''}`}>
                        <div className="file-upload-design">
                            <div className="upload-icon">
                                <i className="fas fa-file-signature"></i>
                            </div>
                            <p>Click to Upload Signature</p>
                            <p className="upload-instruction-text">"Make sure the signature is clearly visible."</p>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleSignatureChange}
                            ref={signatureInputRef}
                        />
                    </label>
                ) : (
                    <div className="preview-container mt-2">
                        <img src={signatureImage} alt="Signature Preview" className="uploaded-preview" />
                        <button className="btn-remove" onClick={() => setSignatureImage(null)}>
                            &times; Change Signature
                        </button>
                    </div>
                )}
                {errors.signature && <div className="error-msg text-center">{errors.signature}</div>}
            </div>

            {/* API Error Box */}
            {errors.api && <div className="error-msg text-center mb-3 mt-2">{errors.api}</div>}
            
            {/* 4. Generate Button */}
            <div className="action-section">
                    <button 
                        type="button" 
                        className="btn-submit" 
                        onClick={generateAnalysis} 
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="loader"></span>
                                <span>Analyzing Signature...</span>
                            </>
                        ) : (
                            "Analyze Signature"
                        )}
                    </button>
                    
                    {loading && (
                        <p className="loading-note">
                            AI is studying the strokes and curves...<br/>
                            Please wait a moment.
                        </p>
                    )}
            </div>
            
            {/* Reset Everything */}
            {(userName || doctorCropped || signatureImage) && !loading && (
               <div className="text-center mt-3">
                   <button className="btn btn-link text-danger" style={{fontSize: '14px', textDecoration: 'none'}} onClick={resetAll}>
                       Clear All Fields
                   </button>
               </div>
            )}
            
        </div>
      </div>

      {/* MODAL FOR DOCTOR PHOTO CROPPING */}
      {showCropModal && doctorOriginal && (
        <div className="modal">
            <div className="modal-content">
                <button className="close-modal" onClick={closeCropModal}>&times;</button>
                <p className="crop-instruction">
                    "Please crop the face. Make sure it is clearly visible."
                </p>
                <div className="image-crop-container">
                    <Cropper
                        ref={cropperRef}
                        src={doctorOriginal}
                        className="cropper-component"
                        aspectRatio={1} // Square Crop
                        guides={true}
                        viewMode={1}
                        background={false}
                        responsive={true}
                        autoCropArea={1}
                        checkOrientation={false}
                    />
                </div>
                <button className="btn-submit mt-3" onClick={handleCrop}>Save & Crop</button>
            </div>
        </div>
      )}

      {/* RESULT DISPLAY OVERLAY (SPLIT LAYOUT) */}
      {/* RESULT DISPLAY OVERLAY (SPLIT LAYOUT) */}
      {analysisText && (
        <div className="result-display-overlay">
             {/* ✅ yahan ref add kiya */}
          <div 
                className="result-card split-result-card" 
                ref={resultCardRef}
                style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/bg.png)` }}
            >
                {/* Left Side: Images */}
                <div className="result-left-column">
                    <div className="result-img-box">
                        <p className="img-title">Doctor</p>
                        <img src={doctorCropped} alt="Doctor" className="result-doctor-img" />
                    </div>
                    <div className="result-img-box">
                        <p className="img-title">Signature</p>
                        <img src={signatureImage} alt="Signature" className="result-signature-img" />
                    </div>
                </div>

                {/* Right Side: Text & Actions */}
                <div className="result-right-column">
                    <p className="result-subtitle">Signature Analysis for Dr. <strong>{userName}</strong></p>
                    
                    <div className="text-result-wrapper">
                        <p className="analysis-text">{analysisText}</p>
                    </div>
                    
                    {/* ✅ data-html2canvas-ignore se buttons screenshot me nahi aayenge */}
                    <div className="result-actions" data-html2canvas-ignore>
                        <button onClick={downloadReportImage} className="btn-download-report" disabled={downloading}>
                            {downloading ? (
                                <><span className="loader-small"></span> Wait...</>
                            ) : (
                                <><i className="fas fa-download"></i> Save Image</>
                            )}
                        </button>
                        <button onClick={copyToClipboard} className={`btn-copy ${copied ? 'btn-copied' : ''}`}>
                            {copied ? (
                                <><i className="fas fa-check"></i> Copied!</>
                            ) : (
                                <><i className="fas fa-copy"></i> Copy Text</>
                            )}
                        </button>
                        <button onClick={closeResult} className="btn-close-result">
                            Close
                        </button>
                    </div>
                </div>

            </div>
        </div>
      )}

    </div>
  );
};

export default SignatureAnalyzer;