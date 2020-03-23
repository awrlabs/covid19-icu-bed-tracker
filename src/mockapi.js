export function getICUByOrgUnit(orgunitId){
    return [
        {
            name: "Colombo ICU",
            distance: "10km",
            total: 100,
            available: 50
        },
        {
            name: "Gampaha ICU",
            distance: "10km",
            total: 40,
            available: 10
        },
        {
            name: "Jaffna ICU",
            distance: "10km",
            total: 70,
            available: 20
        },
        {
            name: "Kandy ICU",
            distance: "10km",
            total: 10,
            available: 5
        }
    ]
}

export function getICUBeds(num){
    const statuses = ["AVAILABLE", "OCCUPIED", "RESERVED", "INPREP"];
    const categories = ["one", "two"];
    const types = ["medical", "surgery"];

    let beds = [];
    let rand = 0;
    for(var i=1;i<=num;i++){
        rand = Math.floor(Math.random() * 4);

        beds.push({
            name: "A" + i,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            category: categories[Math.floor(Math.random() * categories.length)],
            type: types[Math.floor(Math.random() * types.length)],
        })
    }
    return beds;
}

export function getICU(){
    const icu = {
        id: "LZU2dcf423d",
        name: "Colombo ICU",
        beds: getICUBeds(10)
    };
    return icu;
}