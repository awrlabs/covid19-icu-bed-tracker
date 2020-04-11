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
    const [markerData, setMarkerData] = useState(null);
    const [distanceRequest, setDistanceRequest] = useState(null);

    useEffect(() => {
        if(data){
            // if(!markerData){
                let _markerData = [];
                let _destinationData = [];
                let _keys = {};

                for(var d of data){
                    if(!_keys[d.parent.id]){
                        _markerData.push({
                            id: d.parent.id,
                            name: d.parent.displayName,
                            geometry: d.geometry,
                            icus: []
                        })
                        _keys[d.parent.id] = true;
                    }
                    _markerData.find(p => p.id === d.parent.id).icus.push(d.name);
                    _destinationData.push(d.geometry);
                }

                let destinations = null;
                let distanceRequest = null;
                if(origin){
                    // destinations = _markerData.map(d =>  d.geometry);
                    distanceRequest = {
                        origins: [{lat: origin[1], lng: origin[0]}],
                        destinations: _destinationData,
                        travelMode: 'DRIVING'
                    }
                }

                setMarkerData(_markerData);
                setDistanceRequest(distanceRequest);
            // }
        }
    }, [data.length, origin]);

    const handleMarkerOnHover = (ICUEntry) => {
        setInfoWindowData({
            visible: true,
            ...ICUEntry
        })
    }

    const infoBoxOptions = { closeBoxURL: '' };
    const markerAvailableOptions = {
        icon:{
            path:'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
            fillColor: 'green',
            fillOpacity: 1,
            strokeColor: '#000',
            strokeWeight: 1,
            scale: 1
            
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
    // let destinations = null;
    // let distanceRequest = null;
    // if(origin){
    //     destinations = data.map(d =>  d.geometry);
    //     distanceRequest = {
    //         origins: [{lat: origin[1], lng: origin[0]}],
    //         destinations: destinations,
    //         travelMode: 'DRIVING'
    //     }
    // }

    return (
        <LoadScript
            id="script-loader"
            googleMapsApiKey="AIzaSyBjlDmwuON9lJbPMDlh_LI3zGpGtpK9erc"
        >
            {markerData && 
                <GoogleMap
                    id='example-map'
                    mapContainerStyle={mapContainerStyle}
                    zoom={7.6}
                    center={center}
                >
                    {markerData.map((ICUEntry, index) => {
                        return (
                            <Marker
                                position={{ lat: ICUEntry.geometry.lat, lng: ICUEntry.geometry.lng }}
                                onClick={() => { onMarkerClick(ICUEntry) }}
                                onMouseOver={() => { handleMarkerOnHover(ICUEntry) }}
                                onMouseOut={() => { handleMarkerOnHover(infoWindowInitData) }}
                                options={markerAvailableOptions}
                                key={index}
                            />)
                    })}
                    {infoWindowData.visible &&
                        <InfoBox
                            position={{ lat: infoWindowData.geometry.lat, lng: infoWindowData.geometry.lng }}
                            options={infoBoxOptions}
                        >
                            <div
                                style={{ backgroundColor: 'white', opacity: 0.95, padding: 5 }}
                            >
                                <div style={{ fontSize: 14, fontColor: `#08233B` }}>
                                    <div>Hospital: {infoWindowData.name}</div>
                                    <div><b>ICUs</b></div>
                                    {infoWindowData.icus.map(name => (
                                        <div>{name}</div>
                                    ))}
                                </div>
                            </div>
                        </InfoBox>}
                </GoogleMap>
            }
            {distanceRequest && 
                <DistanceMatrixService 
                    options={distanceRequest}
                    callback={(data, status) => updateDistance(data, status)}
                />
            }
        </LoadScript >
    )
}