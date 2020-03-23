import React, { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api'


const mapContainerStyle = {
    height: "600px",
    width: "100%"
};

const center = {
    lat: 7.87,
    lng: 80.77,
}

export default function ICUMap(props) {

    const {onMarkerClick} = props

    //get this from props
    const data = [
        {
            lat: 7.872,
            lng: 80.778
        },
        {
            lat: 7.972,
            lng: 79.78
        },
    ]

    return (
        <LoadScript
            id="script-loader"
            googleMapsApiKey="AIzaSyBjlDmwuON9lJbPMDlh_LI3zGpGtpK9erc"
        >
            <GoogleMap
                id='example-map'
                mapContainerStyle={mapContainerStyle}
                zoom={7.8}
                center={center}
            >
                {data.map((ICUEntry, index )=>{
                    return (
                        <Marker 
                            position={{lat:ICUEntry.lat, lng:ICUEntry.lng}}
                            onClick={()=>{onMarkerClick(ICUEntry)}}
                        />)
                })}
            </GoogleMap>
        </LoadScript >
    )
}