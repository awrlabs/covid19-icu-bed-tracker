import React, { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoBox, DistanceMatrixService } from '@react-google-maps/api'


const mapContainerStyle = {
    height: "600px",
    width: "100%"
};

const center = {
    lat: 8.11,
    lng: 80.77,
}

const infoWindowInitData = {
    visible: false,
    ...center
}

export default function ICUMap(props) {

    const { onMarkerClick, data, origin, updateDistance } = props

    const [infoWindowData, setInfoWindowData] = useState(infoWindowInitData)

    const handleMarkerOnHover = (ICUEntry) => {
        setInfoWindowData({
            visible: true,
            ...ICUEntry
        })
    }

    const infoBoxOptions = { closeBoxURL: '' };
    const markerAvailableOptions = {
        icon:{
            path:'M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z',
            fillColor: '#00802b',
            fillOpacity: 1,
            strokeColor: '',
            strokeWeight: 0
            
        }
    }
    const markerUnavailableOptions = {
        icon:{
            path:'M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z',
            fillColor: '#DC143C',
            fillOpacity: 1,
            strokeColor: '',
            strokeWeight: 0
            
        }
    }
    let destinations = null;
    let distanceRequest = null;
    if(origin){
        destinations = data.map(d =>  d.geometry);
        distanceRequest = {
            origins: [{lat: origin[1], lng: origin[0]}],
            destinations: destinations,
            travelMode: 'DRIVING'
        }
    }

    return (
        <LoadScript
            id="script-loader"
            googleMapsApiKey="AIzaSyBjlDmwuON9lJbPMDlh_LI3zGpGtpK9erc"
        >
            <GoogleMap
                id='example-map'
                mapContainerStyle={mapContainerStyle}
                zoom={7.6}
                center={center}
            >
                {data.map((ICUEntry, index) => {
                    return (
                        <Marker
                            position={{ lat: ICUEntry.geometry.lat, lng: ICUEntry.geometry.lng }}
                            onClick={() => { onMarkerClick(ICUEntry) }}
                            onMouseOver={() => { handleMarkerOnHover(ICUEntry) }}
                            onMouseOut={() => { handleMarkerOnHover(infoWindowInitData) }}
                            options={ICUEntry.available>0?markerAvailableOptions: markerUnavailableOptions}
                            key={index}
                        />)
                })}
                {infoWindowData.visible &&
                    <InfoBox
                        position={infoWindowData}
                        options={infoBoxOptions}
                    >
                        <div
                            style={{ backgroundColor: 'white', opacity: 0.95, padding: 5 }}
                        >
                            <div style={{ fontSize: 14, fontColor: `#08233B` }}>
                                <div>ICU: {infoWindowData.name}</div>
                                <div>Distance: {infoWindowData.distance}</div>
                                <div>Beds: {infoWindowData.available}</div>
                            </div>
                        </div>
                    </InfoBox>}
            </GoogleMap>
            {origin && 
                <DistanceMatrixService 
                    options={distanceRequest}
                    callback={(data, s) => updateDistance(data, status)}
                />
            }
        </LoadScript >
    )
}