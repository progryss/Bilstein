import React, { useState, useEffect } from "react";
import axios from "axios";
import { useProgressToast } from "./customHooks/useProgressToast";
import { useDropzone } from 'react-dropzone';
import { Box } from '@mui/material';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

const serverUrl = process.env.REACT_APP_SERVER_URL;

function formatImageUrl(imageSrc) {
    if (!imageSrc) return '';
    return imageSrc.startsWith('http') || imageSrc.startsWith('blob:') ? imageSrc : `${serverUrl}${imageSrc}`;
}

function SubcategoryDetails({ data, refresh, closeModel }) {

    const { showProgressToast, updateProgress, finalizeToast, setProgress } = useProgressToast();

    const [subCategory, setSubcategory] = useState(data.subCategory);
    const [color, setColor] = useState(data.labelBg);
    const [labelText, setLabelText] = useState(data.labelText);
    const [labelImage, setLabelImage] = useState(null);
    const [showImage, setShowImage] = useState(formatImageUrl(data.labelImage));

    // image upload
    const onDrop = (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            const imageURL = URL.createObjectURL(file);
            setShowImage(imageURL);
            setLabelImage(file);
        }
    };

    console.log('hi')
    const { getRootProps, getInputProps } = useDropzone({
        accept: 'image/*',
        onDrop,
        multiple: false // Ensure only one file can be handled if that's intended
    });

    useEffect(() => {
        return () => {
            if (showImage) {
                if (showImage.startsWith('blob:')) {
                    URL.revokeObjectURL(showImage);
                }
            }
        };
    }, [showImage]);

    const handleUpdate = async () => {

        const formData = new FormData();
        formData.append('category', data.category);
        formData.append('oldSubCategory', data.subCategory);
        formData.append('subCategory', subCategory);
        formData.append('labelBg', color);
        formData.append('labelText', labelText);
        formData.append('labelImage', labelImage);
        setProgress(0);
        const estimatedSubmitTime = 5000;
        const increment = 100 / (estimatedSubmitTime / 100);
        const toastId = showProgressToast('Updating');
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                const newProgress = prev + increment;
                updateProgress(toastId, newProgress, 'Updating');
                if (newProgress >= 100) clearInterval(progressInterval);
                return newProgress < 100 ? newProgress : 100;
            });
        }, 100);
        try {
            await axios.put(`${serverUrl}/api/update-subcategory`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                withCredentials: true,
            })
            finalizeToast(toastId, true, "Update Successful!")
            closeModel()
            refresh()
        } catch (error) {
            finalizeToast(toastId, false, "", "Update Failed");
            console.error('Error updating:', error);
        } finally {
            clearInterval(progressInterval);
            setProgress(0);
        }
    };

    const cancleUpdate = () => {
        closeModel()
    }

    const modelStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
    };

    return (
        <>
            <div className="container-fluid customer-details mt-3">
                <div className="mb-3" style={modelStyle}>
                    <div className="card">
                        <div className="card-body" sx={{ position: 'relative' }}>
                            <div>
                                <Box className='mt-3'>
                                    <Box>
                                        <label>Filter Option <br /><span>(same as product tag)</span>:</label>
                                        <input
                                            name="subCategory"
                                            value={subCategory}
                                            onChange={(e) => setSubcategory(e.target.value)}
                                            required
                                            className='labelText'
                                            style={{ marginLeft: '35px' }}
                                            placeholder='Enter option name'
                                        />
                                    </Box>
                                    <Box className="mt-4">
                                        <Box className="d-flex">
                                            <label>Label Bg Color:</label>
                                            <input
                                                type="color"
                                                value={color}
                                                onChange={e => setColor(e.target.value)}
                                                style={{ width: '183px', marginLeft: '104px' }}
                                            />
                                        </Box>
                                        <Box className="d-flex mt-3" sx={{ alignItems: 'center' }}>
                                            <label>Label Text:</label>
                                            <input
                                                type='text'
                                                placeholder='enter label text'
                                                value={labelText}
                                                onChange={e => setLabelText(e.target.value)}
                                                className='labelText'
                                            />
                                        </Box>
                                        <Box className="d-flex mt-4" >
                                            <label>Label Image:</label>
                                            <div className='d-flex' style={{ alignItems: 'center', marginLeft: '120px' }}>
                                                <div
                                                    {...getRootProps()}
                                                    style={{
                                                        border: '2px dashed rgb(204, 204, 204)',
                                                        cursor: 'pointer',
                                                        height: '50px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '0 20px',
                                                        width: '183px'
                                                    }}
                                                >
                                                    <input {...getInputProps()} />
                                                    <p style={{ margin: '0' }}>Choose image</p>
                                                </div>
                                                {showImage && (
                                                    <div style={{position:'relative',marginLeft:'10px'}}>
                                                        <img src={showImage} alt="Label Preview" style={{ height: '50px', width: '100px', objectFit: 'contain', border: '1px solid #e8e8e8' }} />
                                                        <HighlightOffIcon onClick={() => {
                                                            setLabelImage("removeImage")
                                                            setShowImage(null);
                                                        }}
                                                            sx={{ cursor: 'pointer',position:'absolute',top:'-12px',right:'-12px' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </Box>
                                    </Box>

                                </Box>
                            </div>
                            <div className="d-flex justify-content-between pt-4">
                                <div>
                                    <button className="btn btn-primary saveBtn btn-sm" onClick={handleUpdate}>Update</button>
                                    <button className="btn btn-outline-secondary ms-2 btn-sm" onClick={cancleUpdate}>Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default SubcategoryDetails;
