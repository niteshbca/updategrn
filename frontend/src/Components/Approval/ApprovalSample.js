import React, { useEffect, useState } from 'react';
import styles from './Approval.module.css';
import axios from 'axios';
import TableComponent from '../Table/Table.rendering'
import LogOutComponent from '../LogOut/LogOutComponent';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function Sample({ managerType }) {
    const [visibleItem, setVisibleItem] = useState(null);
    const [selectedValue, setSelectedValue] = useState({});
    const [list, setList] = useState([]);
    const [gsnList, setGsnList] = useState([])
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isHovered, setIsHovered] = useState(false);


    const [isGsnDataLoaded, setIsGsnDataLoaded] = useState(false);
    const [isListDataLoaded, setIsListDataLoaded] = useState(false);

    //mapping
    const managerFieldMap = {
        'General Manager': 'GeneralManagerSigned',
        'Store Manager': 'StoreManagerSigned',
        'Purchase Manager': 'PurchaseManagerSigned',
        'Account Manager': 'AccountManagerSigned',
        'Auditor': 'AuditorSigned'
    };
    const fieldName = managerFieldMap[managerType];

    const url = process.env.REACT_APP_BACKEND_URL

    // Function to fetch GSN data (extracted for reusability)
        const fetchingGsnData = async () => {
            try {
            const token = localStorage.getItem('authToken');
            console.log('Fetching GSN data with token:', token);
                const resData = await axios.get(`${url}/gsn/getdata`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                const getData = resData.data;
            console.log('Fetched GSN Data:', getData);

            const fetchedList = getData.filter((u) => !u.isHidden); // Simplified check for false or undefined

                // Set initial state of the checkboxes based on fetched data
                const initialSelectedValue = fetchedList.reduce((acc, item) => {
                // Use the correct fieldName for the current managerType (will be AuditorSigned for Auditor)
                if (fieldName && item.hasOwnProperty(fieldName)) {
                    acc[item._id] = item[fieldName] === true ? 'checked' : 'not_checked';
                } else {
                    // Default if field doesn't exist or managerType is unexpected
                    console.warn(`Field ${fieldName} not found for item ${item._id} or invalid managerType ${managerType}`);
                    acc[item._id] = 'not_checked'; 
                }
                    return acc;
                }, {});

            setGsnList(fetchedList); // Update with filtered list
                setSelectedValue(initialSelectedValue);
            setIsGsnDataLoaded(true); // Mark GSN data as loaded
            } catch (err) {
            console.error("Error fetching GSN data", err);
            if (err.response) {
              console.error('GSN Fetch Error Response:', err.response.data);
            }
            }
        };

    // Fetching GSN data on initial load
    useEffect(() => {
        fetchingGsnData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [managerType]); // Re-fetch if managerType changes

    // Fetching GRN data
    useEffect(() => {
        const fetchingGrnData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                console.log('Fetching GRN data with token:', token);
                const resData = await axios.get(`${url}/getdata`, // Assuming this is the correct endpoint for GRN
                    {
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                const data = resData.data;
                console.log('Fetched GRN Data:', data);
                const fetchedList = data.filter((u) => !u.isHidden);

                setList(fetchedList); // Assuming 'list' state is for GRN data
                setIsListDataLoaded(true); // Mark GRN data as loaded
            } catch (err) {
                console.error("Error fetching GRN data", err);
                 if (err.response) {
                    console.error('GRN Fetch Error Response:', err.response.data);
                 }
            }
        };
        fetchingGrnData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showHandler = (index) => {
        setVisibleItem(visibleItem === index ? null : index);
    };

    // Handle form submission
    const handleSubmit = async (e, _Id) => {
        e.preventDefault();
        const currentStatus = selectedValue[_Id] || 'not_checked';
        const payload = {
            _Id,
            managerType,
            status: currentStatus
        };
        console.log('Submitting verification status:', payload);
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.post(`${url}/verify`, payload, {
                 headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                 }
            });
            console.log('Verification Response:', response.data);
            alert('Verification status saved successfully');
            // Refetch GSN data to update the UI
            await fetchingGsnData(); 
        } catch (err) {
            console.error("Error saving verification status", err);
            if (err.response) {
                console.error('Verification Error Response:', err.response.data);
                alert(`Error: ${err.response.data.message || 'Could not save status'}`);
            } else {
                alert('An error occurred while saving the status.');
            }
        }
    };
    useEffect(() => {
        if (isGsnDataLoaded && isListDataLoaded) {
            if (list.length <= gsnList.length) {
                list.length = gsnList.length
                console.log("length is", gsnList.length, list.length)
            }
        }
    }, [isGsnDataLoaded, isListDataLoaded])


    const formatDate = (oldFormat) => {
        if (!oldFormat) return "N/A";
        const date = new Date(oldFormat);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'

        });
       
        return formattedDate
    }


    // Handle radio input change
    const handleRadioChange = (_Id, value) => {
        setSelectedValue(prev => ({ ...prev, [_Id]: value }));
    };

    // **** ADDED: PDF Download Handler ****
    const handleDownloadPDF = (index) => {
        const item = gsnList[index]; // Get the item data
        if (!item) return;
        
        const divElement = document.getElementById(`item-div-${item._id}`);
        if (!divElement) return;

        // Sanitize Party Name
        const partyName = item.partyName || `document-${item._id}`;
        const sanitizedPartyName = partyName.replace(/[^a-zA-Z0-9]/g, '_');

        // Sanitize Manager Type (comes from props)
        const sanitizedManagerType = managerType.replace(/[^a-zA-Z0-9]/g, '_');

        // Elements to hide in PDF
        const elementsToHide = divElement.querySelectorAll('.hide-in-pdf');
        
        // Store original display styles
        const originalDisplayStyles = [];
        elementsToHide.forEach(el => {
            originalDisplayStyles.push(el.style.display);
            el.style.display = 'none';
        });

        // Add a small delay
        setTimeout(() => {
            html2canvas(divElement, { 
                scale: 2,
                useCORS: true,
                logging: false, 
                backgroundColor: '#ffffff' // Ensure background for canvas
            }).then((canvas) => {
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF("p", "mm", "a4");
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let position = 0;
                const pageHeight = 295; // A4 height in mm
                let heightLeft = imgHeight;

                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                // **** UPDATED: PDF Filename ****
                pdf.save(`${sanitizedPartyName}_${sanitizedManagerType}_Status.pdf`);

                // Restore original display styles
                elementsToHide.forEach((el, i) => {
                    el.style.display = originalDisplayStyles[i];
                });
            }).catch(err => {
                console.error("Error generating PDF:", err);
                // Restore display styles even if PDF generation fails
                elementsToHide.forEach((el, i) => {
                    el.style.display = originalDisplayStyles[i];
                });
            });
        }, 100); // 100ms delay
    };

    const isImageFile = (filename) => {
        if (!filename) return false;
        const extension = filename.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension);
    };

    return (
        <>
            <LogOutComponent />
            <div className={styles.outer}>

                {Array.from(gsnList).map((item, index) => {
                    const gsnItem = gsnList[index];
                    const defaultItem = {
                        _id: "0",
                        grinNo: false,
                        grinDate: "N/A",
                        gsn: "N/A",
                        gsnDate: "N/A",
                        poNo: "N/A",
                        poDate: "N/A",
                        partyName: "N/A",
                        innoviceno: "N/A",
                        innoviceDate: "N/A",
                        receivedFrom: "N/A",
                        lrNo: "N/A",
                        lrDate: "N/A",
                        transName: "N/A",
                        vehicleNo: "N/A",
                        file: "N/A",
                        GeneralManagerSigned: "N/A",
                        PurchaseManagerSigned: "N/A",
                        StoreManagerSigned: "N/A",
                        AccountManagerSigned: "N/A",
                        tableData: [],
                        createdAt: "N/A"
                    };
                    const {
                        _id,
                        grinNo,
                        grinDate,
                        gsn,
                        gsnDate,
                        poNo,
                        poDate,
                        partyName,
                        innoviceno,
                        innoviceDate,
                        receivedFrom,
                        lrNo,
                        lrDate,
                        transName,
                        vehicleNo,
                        file,
                        photoPath,
                        tableData,
                        createdAt
                    } = item;
                   
                    const materialList = Array.isArray(tableData) ? tableData : [];

                    // **** UPDATED: Approval Status Check (uses fieldName for current manager) ****
                    const isApprovedByCurrentManager = !!item[fieldName]; 
                    const statusText = isApprovedByCurrentManager ? "(Approved)" : "(Not Approved)";

                    // **** UPDATED: Checkbox Enabled Logic for Auditor ****
                    let isCheckboxEnabled = false;
                    if (managerType === 'Auditor') {
                        // Auditor can now approve regardless of other managers
                        // We still need a basic check, e.g., if the item has essential data like grinNo
                        isCheckboxEnabled = !!item.grinNo; // Enable if grinNo exists (or use another base check)
                    } else {
                        // Original logic for other managers (if needed)
                        isCheckboxEnabled = !!item.grinNo; // Enable based on grinNo for other roles
                    }
                    
                    // Add a console log to check checkbox status
                    console.log(`Item ID: ${item._id}, Manager: ${managerType}, isCheckboxEnabled: ${isCheckboxEnabled}, Current Approval: ${isApprovedByCurrentManager}`);

                    // Get GRIN item data and its photoPath
                    const grinItem = list[index] || {}; // Use empty object as default
                    const grinFile = grinItem.file; // GRIN Bill file path
                    const grinPhotoPath = grinItem.photoPath; // GRIN Photo file path

                    return (

                        <div key={index} id={`item-div-${_id}`} className={styles.show}>
                            <h2
                                style={{
                                    color: "black",
                                    // Add inline hover effect by changing style when isHovered is true
                                    // backgroundColor: isHovered ? "rgba(218, 216, 224, 0.6)" : "transparent",
                                    // padding: isHovered ? "25px" : '',
                                    cursor: "pointer",
                                    // boxShadow: isHovered ? "0px 4px 12px rgba(0,0,0,0.2)" : "none",
                                    // borderRadius: isHovered ? "8px" : "0",                  // Add border radius on hover
                                    transition: "all 0.3s ease",
                                    // transform: isHovered ? "scale(1.05)" : "scale(1)", 
                                    transition: "background-color 0.3s ease",
                                }}
                                onClick={() => showHandler(index)}
                                // onMouseEnter={() => setIsHovered(true)}
                                // onMouseLeave={() => setIsHovered(false)}
                            >
                                {partyName}
                                {/* **** UPDATED: Status Indicator uses current manager status **** */}
                                <span style={{ marginLeft: '10px', fontSize: '0.8em', color: isApprovedByCurrentManager ? 'green' : 'orange' }}>
                                    {statusText}
                                </span>
                            </h2>

                            <div style={{ display: "flex", flexDirection: "row" }}>

                                {/* GSN Section */} 
                                <div className={styles.completeBlock} style={{ display: visibleItem === index ? 'block' : 'none' }}>
                                    {/* GSN details rendering using 'item' fields */}
                                    <div className={styles.grinDetails}>
                                        <h1 style={{ textAlign: "center" }}>GSN</h1>
                                        <div><label htmlFor=""><h5>GRIN Details</h5></label></div>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>GRIN NO.</th>
                                                    <th>Date</th>
                                                    <th>GSN</th>
                                                    <th>Date</th>
                                                    <th>P.O. No.</th>
                                                    <th>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>{grinNo}</td>
                                                    <td>{formatDate(grinDate)}</td>
                                                    <td>{gsn}</td>
                                                    <td>{formatDate(gsnDate)}</td>
                                                    <td>{poNo}</td>
                                                    <td>{formatDate(poDate)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* **** ADDED: GSN Party Details **** */}
                                    <div className={styles.grinDetails}>
                                        <label htmlFor=""><h5>Party Details</h5></label>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Party Name</th>
                                                    <th>Party Invoice No.</th>
                                                    
                                                    <th>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>{partyName}</td>
                                                    <td>{innoviceno}</td>
                                                   {/* <td>{receivedFrom}</td>*/}
                                                    <td>{formatDate(innoviceDate)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* **** ADDED: GSN Transport Details **** */}
                                    <div className={styles.grinDetails}>
                                        <label htmlFor=""><h5>Transport Details</h5></label>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>L.R. No.</th>
                                                    <th>Transporter Name</th>
                                                    <th>Vehicle No.</th>
                                                    <th>L.R. Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>{lrNo}</td>
                                                    <td>{transName}</td>
                                                    <td>{vehicleNo}</td>
                                                    <td>{formatDate(lrDate)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* GSN Material List using item.tableData */} 
                                    <div style={{
                                        border: "1px solid #ccc",
                                        width: "90%",
                                        margin: "2% auto",
                                        padding: "20px",
                                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                        borderRadius: "8px",
                                        backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                        fontFamily: "'Arial', sans-serif",
                                        fontSize: "16px",
                                        lineHeight: "1.6",
                                        boxSizing: "border-box",
                                        maxWidth: "1200px",
                                        overflowWrap: "break-word",
                                    }}>
                                        <h5 style={{ textAlign: "center" }}>Material List (GSN)</h5>
                                        <TableComponent tableData={materialList} />
                                    </div>
                                    {/* GSN CreatedAt using item.createdAt */} 
                                    <div className="timestamp" style={{
                                        textAlign: 'center',
                                        padding: '20px',
                                        backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                        borderRadius: '10px',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                        border: '1px solid #e0e0e0',
                                        margin: '20px auto',
                                        maxWidth: '400px',
                                        fontFamily: "'Roboto', sans-serif",
                                        color: '#333',
                                    }}>
                                        <h1 style={{
                                            fontSize: '24px',
                                            marginBottom: '10px',
                                            color: '#2c3e50',
                                            letterSpacing: '1px',
                                            textTransform: 'uppercase',
                                        }}>Created At (GSN)</h1>
                                        <p style={{
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            color: '#34495e',
                                        }}>{formatDate(createdAt)}</p>
                                    </div>
                                    {/* GSN Uploaded Photo */} 
                                    {photoPath && (
                                    <div style={{
                                            width: "90%", margin: "20px auto", padding: "15px", 
                                            border: "1px solid #ccc", borderRadius: "8px", textAlign: "center",
                                            backgroundColor: 'rgba(218, 216, 224, 0.6)', 
                                        }}>
                                            <h2 style={{ color: "#007bff", fontSize: "24px", marginBottom: "15px" }}>Uploaded Photo (GSN)</h2>
                                            <img src={`${url}/${photoPath}`} alt="GSN Uploaded Photo" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '5px' }} />
                                        </div>
                                    )}
                                </div>

                                {/* GRN Section - **** CORRECTED TO USE listItem **** */} 
                                <div className={styles.completeBlock} style={{ display: visibleItem === index ? 'block' : 'none' }}>
                                    <div className={styles.grinDetails}>
                                        <h1 style={{ textAlign: "center" }}>GRIN</h1>
                                        <div><label htmlFor=""><h5>GRIN Details</h5></label></div>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>GRIN NO.</th>
                                                    <th>Date</th>
                                                    <th>GSN</th>
                                                    <th>Date</th>
                                                    <th>P.O. No.</th>
                                                    <th>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    {/* Use listItem fields, provide fallback */}
                                                    <td>{grinItem.grinNo ?? 'N/A'}</td>
                                                    <td>{formatDate(grinItem.grinDate)}</td>
                                                    <td>{grinItem.gsn ?? 'N/A'}</td>
                                                    <td>{formatDate(grinItem.gsnDate)}</td>
                                                    <td>{grinItem.poNo ?? 'N/A'}</td>
                                                    <td>{formatDate(grinItem.poDate)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className={styles.grinDetails}>
                                        <label htmlFor=""><h5>Party Details</h5></label>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Party Name</th>
                                                    <th>Party Invoice No.</th>
                                                    <th>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>{grinItem.partyName ?? 'N/A'}</td>
                                                    <td>{grinItem.innoviceno ?? 'N/A'}</td>
                                                    <td>{formatDate(grinItem.innoviceDate)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className={styles.grinDetails}>
                                        <label htmlFor=""><h5>Transport Details</h5></label>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>L.R. No.</th>
                                                    <th>Transporter Name</th>
                                                    <th>Vehicle No.</th>
                                                    <th>L.R. Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>{grinItem.lrNo ?? 'N/A'}</td>
                                                    <td>{grinItem.transName ?? 'N/A'}</td>
                                                    <td>{grinItem.vehicleNo ?? 'N/A'}</td>
                                                    <td>{formatDate(grinItem.lrDate)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* GRN Material List using listItem.tableData */} 
                                    <div style={{
                                        border: "1px solid #ccc",
                                        width: "90%",
                                        margin: "2% auto",
                                        padding: "20px",
                                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                                        borderRadius: "8px",
                                        backgroundColor: "rgba(218, 216, 224, 0.6)",
                                        fontFamily: "'Arial', sans-serif",
                                        fontSize: "16px",
                                        lineHeight: "1.6",
                                        boxSizing: "border-box",
                                        maxWidth: "1200px",
                                        overflowWrap: "break-word",
                                    }}>
                                        <h5 style={{ textAlign: "center" }}>Material List (GRIN)</h5>
                                        <TableComponent tableData={Array.isArray(grinItem.tableData) ? grinItem.tableData : []} />
                                    </div>
                                     {/* GRN CreatedAt using listItem.createdAt */} 
                                    <div className="timestamp" style={{
                                        textAlign: 'center',
                                        padding: '20px',
                                        backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                        borderRadius: '10px',
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                        border: '1px solid #e0e0e0',
                                        margin: '20px auto',
                                        maxWidth: '400px',
                                        fontFamily: "'Roboto', sans-serif",
                                        color: '#333',
                                    }}>
                                        <h1 style={{
                                            fontSize: '24px',
                                            marginBottom: '10px',
                                            color: '#2c3e50',
                                            letterSpacing: '1px',
                                            textTransform: 'uppercase',
                                        }}>Created At (GRIN)</h1>
                                        <p style={{
                                            fontSize: '18px',
                                            fontWeight: 'bold',
                                            color: '#34495e',
                                        }}>{formatDate(grinItem.createdAt)}</p>
                                    </div>
                                     {/* GRN Uploaded Photo */} 
                                    {grinPhotoPath && (
                                    <div style={{
                                            width: "90%",
                                            margin: "20px auto",
                                        padding: "15px",
                                            border: "1px solid #ccc",
                                        borderRadius: "8px",
                                            textAlign: "center",
                                            backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                    }}>
                                            <h2 style={{
                                                color: "#007bff",
                                                fontSize: "24px",
                                                marginBottom: "15px",
                                            }}>Uploaded Photo (GRIN)</h2>
                                            <img 
                                                src={`${url}/${grinPhotoPath}`} 
                                                alt="GRIN Uploaded Photo" 
                                                style={{ 
                                                    maxWidth: '100%', 
                                                    maxHeight: '400px', 
                                                    objectFit: 'contain', 
                                                    borderRadius: '5px' 
                                                }} 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* --- ADDED: Centered GRN Bill Details --- */}
                            {visibleItem === index && grinFile && (
                                <div style={{ 
                                    width: "45%", // Takes roughly half width to sit between
                                    margin: "20px auto", 
                                    padding: "15px", 
                                    border: "1px solid #ccc", 
                                    borderRadius: "8px", 
                                    textAlign: "center",
                                    backgroundColor: 'rgba(218, 216, 224, 0.6)', 
                                }}>
                                    <h2 style={{ color: "#007bff", fontSize: "24px", marginBottom: "15px" }}>Bill Details (GSN or GRIN)</h2>
                                    {isImageFile(grinFile) ? (
                                        <img src={`${url}/${grinFile}`} alt="GRIN Bill" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '5px' }} />
                                    ) : (
                                        <a href={`${url}/${grinFile}`} target="_blank" rel="noopener noreferrer" style={{
                                                    display: "inline-block",
                                                    padding: "10px 20px",
                                                    backgroundColor: "#28a745",
                                                    color: "#fff",
                                                    textDecoration: "none",
                                                    borderRadius: "5px",
                                                    transition: "background-color 0.3s ease"
                                        }}>View/Download Bill</a>
                                            )}
                                        </div>
                            )}
                            {visibleItem === index && !grinFile && (
                                <div style={{ /* Styling for no GRIN bill */ 
                                    width: "45%", margin: "20px auto", textAlign: "center", padding: "15px"
                                }}>
                                     <p style={{ color: "#dc3545", fontSize: "18px" }}>No GRIN bill file available</p>
                                </div>
                            )}
                            {/* --- END: Centered GRN Bill Details --- */}
                            
                            {/* 3 */}
                            <div className={`${styles.sign} hide-in-pdf`}
                                style={{
                                    width: '90%',
                                    display: 'flex',
                                    margin: '5px',
                                    padding: '1px',
                                    // backgroundColor: 'rgba(218, 216, 224, 0.6)',
                                    animation: "gradientBG 10s ease infinite",
                                    flexDirection: windowWidth <= 600 ? "column" : "row",
                                    // boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                                    animation: 'fadeIn 1s ease',
                                    margin: windowWidth <= 600 ? '0' : '20px',
                                    justifyContent: 'center',
                                    alignItems: "center",
                                    // border: "1px solid #ccc",
                                    borderRadius: "12px"
                                }}>
                                <form onSubmit={(e) => handleSubmit(e, _id)} style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: "center" }}>
                                    <div className={styles.submission}>
                                        <div>
                                            <label htmlFor={`checkbox-${_id}`}><h6>Approve ({managerType})</h6></label>
                                            <br/><center> <input
                                                id={`checkbox-${_id}`}
                                                disabled={!isCheckboxEnabled}
                                                style={{
                                                    width: '12px', /* Adjust width */
                                                    height: '20px', /* Adjust height */
                                                    transform: 'scale(1.5)', /* Increase size */
                                                    cursor: !isCheckboxEnabled ? 'not-allowed' : 'pointer',
                                                    marginLeft: '10px'
                                                }}
                                                name={`checkbox-${_id}`}
                                                value='checked'
                                                type="checkbox"
                                                onChange={() => handleRadioChange(_id, selectedValue[_id] === 'checked' ? 'not_checked' : 'checked')} // Toggle
                                                checked={selectedValue[_id] === 'checked'}
                                            /></center>
                                        </div>
                                    </div>
                                    <button
                                        type='submit'
                                        className="hide-in-pdf"
                                        style={{
                                            width: '100%',
                                            maxWidth: '100px',
                                            margin: '5px',
                                            padding: "0 10px",
                                            minWidth: "80px",       // Increase padding for better touch interaction
                                            borderRadius: '15px',
                                            border: '2px solid transparent', // Solid border for better contrast
                                            backgroundColor: 'rgba(230, 216, 224, 0.8)',
                                            color: 'black',
                                            fontSize: '1rem',      // Relative font size for scalability
                                            transition: 'background-color 0.3s ease',  // Add smooth hover effect
                                            opacity: !isCheckboxEnabled ? 0.6 : 1,
                                            cursor: !isCheckboxEnabled ? 'not-allowed' : 'pointer',
                                        }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = "#0056b3"}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = "rgba(218, 216, 224, 0.8)"}
                                        disabled={!isCheckboxEnabled} // Disable button based on logic
                                    >Submit</button>
                                </form>
                            </div>

                            {/* **** UPDATED: Conditional PDF Download Button (uses current manager status) **** */}
                            {isApprovedByCurrentManager && (
                                <button 
                                    onClick={() => handleDownloadPDF(index)} 
                                    className="download-pdf-button hide-in-pdf" 
                                    style={{ 
                                        marginTop: "10px", 
                                        padding: "5px 10px",
                                        marginBottom:"20px", 
                                        background: "#17a2b8", // Info color for individual approval PDF
                                        color: "white", 
                                        border: "none", 
                                        cursor: "pointer",
                                        display: "block" 
                                    }}
                                >
                                    Download Status PDF 
                                </button>
                            )}
                        </div>

                    );
                })}
            </div>

        </>
    );
}






