// customHooks/useProgressToast.js
import { useState } from 'react';
import { toast } from 'react-toastify';
import LinearProgress from '@mui/material/LinearProgress';
import React from 'react';
import Loader from '../loader';

export const useProgressToast = () => {
    const [progress, setProgress] = useState(0);

    const showProgressToast = (message = "Processing") => {
        const toastId = toast.success(
            <div>
                <div style={{ margin: '0',display:'flex'  }}>{message}{progress === 0 ? <Loader/> : `... ${Math.round(progress)}%`}</div>
                <LinearProgress variant="determinate" value={progress} style={{ width: '100%', position: "absolute", bottom: 0,left:'0px' }} />
            </div>,
            { autoClose: false, closeOnClick: false, closeButton: true }
        );
        return toastId;
    };

    const updateProgress = (toastId, newProgress, message = "Processing") => {
        if(newProgress !== 'loader'){
            setProgress(newProgress)
        }
        toast.update(toastId, {
            render: (
                <div>
                    <div style={{ margin: '0',display:'flex' }}>{message}{newProgress !== 'loader' ? `... ${Math.round(newProgress)}%` :<Loader />}</div>
                    {newProgress !== 'loader' ? <LinearProgress variant="determinate" value={newProgress} style={{ width: '100%', position: "absolute", bottom: 0 ,left:'0px'}} /> : ''}
                </div>
            )
        });
    };

    const finalizeToast = (toastId, isSuccess, successMessage = "Completed!", errorMessage = "Failed") => {
        toast.update(toastId, {
            render: isSuccess ? successMessage : errorMessage,
            type: isSuccess ? "success" : "error",
            autoClose: 4000,
            closeOnClick: true,
            closeButton: true,
        });
        setProgress(0);
    };

    return {
        showProgressToast,
        updateProgress,
        finalizeToast,
        setProgress
    };
};
