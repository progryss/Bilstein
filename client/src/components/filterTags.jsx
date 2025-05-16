import React, { useEffect, useState } from 'react';
import { Button, Box, TextField } from '@mui/material';
import axios from 'axios';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useDropzone } from 'react-dropzone';
import Modal from '@mui/material/Modal';
import SubcategoryDetails from './subcategoryDetails';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';

import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const serverUrl = process.env.REACT_APP_SERVER_URL;

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`vertical-tabpanel-${index}`}
            aria-labelledby={`vertical-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
};

function a11yProps(index) {
    return {
        id: `vertical-tab-${index}`,
        'aria-controls': `vertical-tabpanel-${index}`,
    };
}

function FilterTags() {

    const [category, setCategory] = useState('');
    const [subCategory, setSubcategory] = useState('');
    const [filterData, setFilterData] = useState([]);
    const [r1, setR1] = useState(true);
    const [selectValue, setSelectValue] = useState('blank');
    const [color, setColor] = useState('#d9d9d9');
    const [labelText, setLabelText] = useState('');
    const [labelImage, setLabelImage] = useState(null);
    const [showImage, setShowImage] = useState(null);

    const [modelOpen, setModelOpen] = React.useState(false);
    const handleCloseModel = () => setModelOpen(false);
    const [tagPopopData, setTagPopopData] = useState(null);

    const [value, setValue] = React.useState(0);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    const addCategory = async () => {
        if (!category.trim()) {
            return alert('category name cant be empty')
        }
        const payload = {
            name: category
        };
        try {
            const response = await axios.post(`${serverUrl}/api/add-category`, payload, {
                withCredentials: true
            });
            console.log(response.data);
            setCategory('');
            setR1(!r1)
        } catch (error) {
            console.error('Failed to add category:', error);
        }
    };

    const addSubCategory = async () => {
        if (selectValue === 'blank') {
            alert('Select Category First');
            return;
        }
        if (!subCategory.trim()) {
            alert('Sub Category name can\'t be empty');
            return;
        }

        const formData = new FormData();
        formData.append('category', selectValue);
        formData.append('subCategory', subCategory);
        formData.append('labelBg', color);
        formData.append('labelText', labelText);
        formData.append('labelImage', labelImage);
        try {
            const response = await axios.put(`${serverUrl}/api/update-category`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true,
            });
            setSelectValue('blank');
            setSubcategory('');
            setColor('#d9d9d9');
            setLabelText('');
            setLabelImage(null);
            setShowImage(null);
            setR1(!r1);
        } catch (error) {
            console.error('Failed to add sub category:', error);
        }
    };

    useEffect(() => {
        getCategory()
    }, [r1])

    const getCategory = async () => {
        try {
            const response = await axios.get(`${serverUrl}/api/get-category`, {
                withCredentials: true
            })
            setFilterData(response.data)
        } catch (error) {
            console.log('error in fetching filter data')
        }
    }

    // image upload
    const onDrop = (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) {
            setLabelImage(file); // Save the file object itself, not the URL
            setShowImage(URL.createObjectURL(file));
        }
    };

    const { getRootProps, getInputProps } = useDropzone({
        accept: 'image/jpeg, image/png, image/gif',
        onDrop,
    });

    const deleteSubCat = async (cat, subCat) => {
        const payload = {
            category: cat,
            subCategory: subCat
        };
        const userResponse = window.confirm(`Are you sure you want to delete ( ${payload.subCategory} ) ?`);
        if (!userResponse) return;
        try {
            let response = await axios.delete(`${serverUrl}/api/delete-subCategory`, {
                data: payload,  // Using data property to send body
                withCredentials: true
            });
            setR1(!r1);
            console.log(response);
        } catch (error) {
            console.log('error deleting subCategory', error);
        }
    };

    const refreshIt = () => {
        setR1(!r1)
    }

    const updateSubCat = (category, subcategory) => {
        setModelOpen(true);
        let data = {
            category: category,
            subCategory: subcategory.subCategory,
            labelBg: subcategory.labelBg,
            labelText: subcategory.labelText,
            labelImage: subcategory.labelImage
        }
        setTagPopopData(data)
    }

    const onDragEnd = async (result) => {
        if (!result.destination) return;

        const categoryIndex = filterData.findIndex(c => c.name === result.type);  // Assuming you use the category name as the type
        if (categoryIndex === -1) return;

        const category = filterData[categoryIndex];
        const newOptions = Array.from(category.options);
        const [reorderedItem] = newOptions.splice(result.source.index, 1);
        newOptions.splice(result.destination.index, 0, reorderedItem);
        category.options = newOptions
        const payload = category
        try {
            const response = await axios.put(`${serverUrl}/api/update-subcategory-order`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
                withCredentials: true,
            })
            console.log(response.data)
        } catch (error) {
            console.log(error)
        }
    };

    return (
        <>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', paddingTop: '20px' }}>
                <Box className="ps-2">
                    <Box>
                        <p>Add Filter Section -</p>
                        <TextField
                            label="Enter Filter Heading"
                            name="category"
                            size="small"
                            variant="outlined"
                            required
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        />
                        <Button
                            variant="contained"
                            className='ms-2'
                            onClick={() => {
                                addCategory();
                            }}
                        >
                            Add Heading
                        </Button>
                    </Box>
                    <Box className='mt-3' >
                        <p>Add Filter Option - </p>
                        <Box>
                            <label>Choose Filter Heading:</label>
                            <Select
                                size="small"
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={selectValue}
                                onChange={e => setSelectValue(e.target.value)}
                                sx={{ marginLeft: '42px', width: '183px' }}
                            >
                                <MenuItem value='blank' disabled>Select Heading</MenuItem>
                                {filterData.map((element, index) => (
                                    <MenuItem key={index} value={element.name}>{element.name}</MenuItem>
                                ))}
                            </Select>
                        </Box>
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
                                        style={{ width: '183px', marginLeft: '104px',border:'none' }}
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
                                                border: '1px dashed rgb(204, 204, 204)',
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
                                        {labelImage && (
                                            <div>
                                                <img src={showImage} alt="Selected" style={{ height: '50px', width: '100px', marginLeft: '10px', border: '1px solid #e8e8e8' }} />
                                            </div>
                                        )}
                                    </div>
                                </Box>
                            </Box>
                            <Button
                                variant="contained"
                                className='mt-4'
                                onClick={() => {
                                    addSubCategory()
                                }}
                            >
                                Add Filter Option
                            </Button>
                        </Box>

                    </Box>
                </Box>
                <Box
                    sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', height: 400 }}
                >
                    <Tabs
                        orientation="vertical"
                        variant="scrollable"
                        value={value}
                        onChange={handleChange}
                        aria-label="Vertical tabs example"
                        sx={{ borderRight: 1, borderColor: 'divider' }}
                    >
                        {filterData.map((category, index) => (
                            <Tab key={index} label={category.name} {...a11yProps(index)} style={{ alignItems: 'flex-start' }} />
                        ))}
                    </Tabs>
                    {filterData.map((category, catIndex) => (
                        <TabPanel value={value} index={catIndex} key={catIndex}>
                            <DragDropContext onDragEnd={onDragEnd}>
                                <Droppable droppableId={`item-${catIndex}`} type={category.name}>
                                    {(provided, snapshot) => (
                                        <ul ref={provided.innerRef} {...provided.droppableProps} style={{ padding: '0', minWidth: '450px' }}>
                                            {category.options.length > 0 ? category.options.map((option, index) => (
                                                <Draggable key={`item-${index}`} draggableId={`item-${index}`} index={index}>
                                                    {(provided, snapshot) => (
                                                        <li
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                padding: '6px 10px',
                                                                display: 'flex',
                                                                justifyContent: 'space-between'
                                                            }}
                                                        >
                                                            <span>
                                                                <DeleteOutlineIcon className='me-3' style={{ color: '#d52121', cursor: 'pointer' }} onClick={() => deleteSubCat(category.name, option.subCategory)} />
                                                                <i className='fa fa-edit me-3' style={{ color: '#1976d2', fontSize: '15px', cursor: 'pointer' }} onClick={() => updateSubCat(category.name, option)}></i>
                                                                {option.subCategory}
                                                            </span>
                                                            {option.labelImage ? (
                                                                <span style={{ display: 'flex', gap: '15px' }}>
                                                                    <img src={`${serverUrl}${option.labelImage}`} style={{ height: '25px', width: '100px', objectFit: 'contain', border: '1px solid #e8e8e8' }} />
                                                                    <div {...provided.dragHandleProps}>
                                                                        <DragIndicatorIcon />
                                                                    </div>
                                                                </span>
                                                            ) : option.labelText && option.labelImage == null ? (
                                                                <span style={{ display: 'flex', gap: '15px' }}>
                                                                    <span style={{
                                                                        width: '100px',
                                                                        background: `${option.labelBg}`,
                                                                        fontSize: '12px',
                                                                        fontWeight: '600',
                                                                        display: 'flex',
                                                                        justifyContent: 'center',
                                                                        alignItems: 'center'
                                                                    }}>
                                                                        {option.labelText}
                                                                    </span>
                                                                    <div {...provided.dragHandleProps}>
                                                                        <DragIndicatorIcon />
                                                                    </div>
                                                                </span>
                                                            ) : (
                                                                <span style={{ display: 'flex', gap: '15px' }}>
                                                                    <span style={{ width: '100px', background: `${option.labelBg}` }}>{option.labelText}</span>
                                                                    <div {...provided.dragHandleProps}>
                                                                        <DragIndicatorIcon />
                                                                    </div>
                                                                </span>
                                                            )}
                                                        </li>
                                                    )}
                                                </Draggable>
                                            )) : 'No tag found !'}
                                            {provided.placeholder}
                                        </ul>
                                    )}
                                </Droppable>
                            </DragDropContext>
                        </TabPanel>
                    ))}

                </Box>
            </Box>

            <Modal
                open={modelOpen}
                onClose={handleCloseModel}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <div>
                    <SubcategoryDetails data={tagPopopData} refresh={refreshIt} closeModel={handleCloseModel} />
                </div>
            </Modal>

        </>
    );
}

export default FilterTags;
