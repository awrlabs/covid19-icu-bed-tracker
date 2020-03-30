// cache to store values that are not going to change overtime
import Dexie from 'dexie';


const db = new Dexie("icu-tracker");

db.version(1).stores({
    ous: 'id, name, level, icuList',
    icus: 'id, distance, total, available, geometry'
});

export function getCache(cacheName){
    if(cacheName === "ous"){
        return db.ous;
    }else if(cacheName === "icus"){
        return db.icus;
    }
}

export async function retrieveCache(cache, key){
    return await cache.get(key);
}

export async function storeCache(cache, object){
    // console.log(object);
    const obj = await retrieveCache(cache, object.id);
    console.log(obj);
    if(!obj){
        await cache.add(object);
    }
}