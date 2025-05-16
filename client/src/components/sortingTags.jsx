import { Button } from '@mui/material';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useProgressToast } from "./customHooks/useProgressToast";

const serverUrl = process.env.REACT_APP_SERVER_URL;
function SortingTags() {
    const { showProgressToast, updateProgress, finalizeToast, setProgress } = useProgressToast();
    const [value, setValue] = useState('')

    const updateSortingTags = async () => {
        const toastId = showProgressToast('Saving Data...');
        updateProgress(toastId, 'loader', 'Saving Data...');
        const payload = {
            sortingTags: value
        }
        try {
            const response = await axios.put(`${serverUrl}/api/update-sorting-tags`, payload)
            console.log(response)
            finalizeToast(toastId, true, "Data Saved Successfully!");
        } catch (error) {
            finalizeToast(toastId, false, "Failed to save data.");
            console.log(error)
        }
    }

    const getSortingTags = async () => {
        try {
            const response = await axios.get(`${serverUrl}/api/sorting-tags`);
            setValue(response.data[0].sortTag)
        } catch (error) {
            console.log(error)
        }
    }
    useEffect(() => {
        getSortingTags()
    }, [])
    return (
        <div className='mt-4 ms-2'>
            <p>Sorting Tags : (Add multiple product tags with comma "," separator)</p>
            <textarea onChange={e => setValue(e.target.value)} name="w3review" rows="10" value={value} placeholder='Add tags here...' style={{ padding: '10px', width: "calc(100% - 10px )" }} />
            <div>
                <Button variant='contained' className='mt-3' onClick={updateSortingTags}>Update</Button>
            </div>
        </div>
    )
}

export default SortingTags;
