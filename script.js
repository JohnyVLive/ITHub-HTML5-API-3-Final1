// Произвольный контент в балунах
// https://yandex.ru/dev/maps/jsbox/2.1/sidebar

// Координаты щелчка
// https://yandex.ru/dev/maps/jsbox/2.1/event_properties/

// Мои классы для объектов избранных мест и фото
class FavorPlaces{
     constructor(lsObj){
         if (lsObj){
             this.places = lsObj
         } else {
             this.places = []
         }
    }

    addPlace(place){
         const lastElem = this.places.slice(-1)
        if (lastElem.length === 0){
            this.places.push({id: 1, place})
        } else {
            this.places.push({id: lastElem[0].id + 1, place})
        }
    }

    getPlaces(){
         return this.places
    }

    showPlaces(){
         console.log(this.places)
    }
}

class FavorImages{
    constructor(lsObj){
        if (lsObj){
            this.images = lsObj
        } else {
            this.images = []
        }
    }

    addImage(image){
        this.images.push(image)
    }

    getImages(){
        return this.images
    }

    getImage(id){
        if (id){
            for (let image of this.images){
                if (image.id === id) return image
            }
        } else return false
    }

    showImages(){
        console.log(this.images)
    }
}


// ---- Yandex API ----
function loadSuccess(){
    console.log('YaAPI successfully loaded')
}

function loadError(){
    console.log('YaAPI did not load')
}

let myMap
let multiRoute
let myPlaces = new FavorPlaces(JSON.parse(loadFromLS('myMapFavor')))
let myImages = new FavorImages(JSON.parse(loadFromLS('myImgs')))

let divFavorList
let ulFavorList


ymaps.ready(['Panel']).then(function () {

    myMap = new ymaps.Map("YMapsID",
        {
            center: [55.76, 37.64],
            zoom: 10,
            type: 'yandex#map',
            // схема ('yandex#map')
            // спутник ('yandex#satellite')
            // гибрид ('yandex#hybrid')

            // controls: ['searchControl']
            controls: []
            // controls: ['routePanelControl']

        }, {
            // Будет производиться поиск по топонимам и организациям.
            searchControlProvider: 'yandex#search'
            // Варианты
            // yandex#map — поиск только по топонимам. Позволяет настроить отображение результатов.
            // yandex#search — поиск по топонимам и организациям.
            // yandex#publicMap - народная карта
        }),

        // Создаем экземпляр класса ymaps.control.SearchControl
        mySearchControl = new ymaps.control.SearchControl({
            options: {
                noPlacemark: true,
                float: 'right'
            }
        }),
        // Результаты поиска будем помещать в коллекцию.
        mySearchResults = new ymaps.GeoObjectCollection(null, {
            hintContentLayout: ymaps.templateLayoutFactory.createClass(
                '<h3>$[properties.name]</h3>' +
                '<b>Оценка:</b> $[properties.rating.score]'
            )
        }), loadSuccess()


    myMap.controls.add(mySearchControl)
    myMap.geoObjects.add(mySearchResults)

    //Загружаем из LocalStorage и наводимся на положение пользователя
    showUserLocation()


    // При клике по найденному объекту метка становится красной.
    mySearchResults.events.add('click', function (e) {
        // Удалить маршруты с карты
        myMap.geoObjects.remove(multiRoute)
        e.get('target').options.set('preset', 'islands#redIcon')
    })
    // Выбранный результат помещаем в коллекцию.
    mySearchControl.events.add('resultselect', function (e) {
        let index = e.get('index')

        mySearchControl.getResult(index).then(function (res) {
            mySearchResults.add(res)

        });
    })
    //     .add('submit', function () {
    //     mySearchResults.removeAll();
    // })

    // Действия при клике на строке поиска
    mySearchControl.events.add('click', (e) => {
        // Удалить маршруты с карты
        myMap.geoObjects.remove(multiRoute)

        //TODO: Закрыть открытую панель с информацией о точке
    })

    //TODO: Нельзя выбрать другой маршрут - ошибка
    myMap.geoObjects.events.add('click', (e) => {

        // Удалить маршруты с карты
        myMap.geoObjects.remove(multiRoute)

        // Получим ссылку на геообъект, по которому кликнул пользователь.
        const target = e.get('target');
        // Выделяем все интересующие данные объекта
        const objData = target.properties._data

        //TODO: Сделать проверку на повторное добавление

        if (objData.myId || objData.myId === 'myId'){
            console.log('Нельзя добавить объект в базу: или есть Id, или это я.')
            if (objData.myId != 'myId'){
                // Зададим контент боковой панели.
                panel.setContent(target.properties.get('balloonContent'));
                // Переместим центр карты по координатам метки с учётом заданных отступов.
                myMap.panTo(target.geometry.getCoordinates(), {useMapMargin: true});
            }

        } else {
            const objCoords = e.get('target').geometry.getCoordinates()
            const objCategories = objData.categories
            const objName = objData.name
            const objAddress = objData.address
            // const objRate = objData.rating.score

            const place = {
                coords: objCoords,
                type: objCategories,
                name: objName,
                address: objAddress,
                // rate:  objRate,
                myRate: 0
            }

            myPlaces.addPlace(place)
            // Сохраняем избранное в базу
            saveToLS('myMapFavor', JSON.stringify(myPlaces.getPlaces()))
        }

        //TODO: Сделать управление объектами на карте через коллекции
        // // Коллекция геообъектов любимых мест
        // mapCollection = new ymaps.GeoObjectCollection(null, {
        //     // Запретим появление балуна.
        //     hasBalloon: false,
        //     iconColor: '#3b5998',
        //     // hintContentLayout: ymaps.templateLayoutFactory.createClass('$[properties.name]')
        // })

    })

    // Создадим и добавим панель на карту.
    let panel = new ymaps.Panel();
    myMap.controls.add(panel, {
        float: 'left'
    });

})

function setPlacemarkOnMap(id, mark){
    let balloonContent =
        `<h3>${mark.name}</h3>`+
        `<p>` +
        `<b>Категория:</b> ${mark.type} <br>` +
        `<b>Адрес:</b> ${mark.address} <br>` +
        `<b>Моя оценка:</b> ${mark.myRate} <br>` +
        `</p>`

    const routeButton = `<button onclick="makeRoute(${JSON.stringify(mark.coords)})">Маршрут</button> <br>`

    const addPhotoBlock =
        `<button id="buttonUploadPhoto" onclick="drawUploadPhotoPanel(${id})">Загрузить фото</button> <br>` +
        `<div id="divSendPhoto"></div><br>`


    if (!myImages.getImage(id)) {
        balloonContent += addPhotoBlock
    } else {
        const image = `<img src="${myImages.getImage(id).data}"/><br>`
        balloonContent += image
    }

    balloonContent += routeButton

    if (myMap) {
        if (mark){
            // console.log(mark)

            let placemark = new ymaps.Placemark(mark.coords, {
                    myId: id,
                    // hasBalloon: false,
                    balloonContent: balloonContent,
                },
                {
                    iconColor: '#3b5998',
                    hasBalloon: false,
                    //TODO: Вывести хинт на объекты
                    hintContentLayout: ymaps.templateLayoutFactory.createClass('<h3>$[mark.name]</h3>')
                })
            // console.log(placemark)
            myMap.geoObjects.add(placemark)
        } else {
            console.log('Please try again')
        }
    }
}

// Добавить объекты в коллекцию и на карту
function showFavor(places){
    clearMap()
    getUserLocation()

    divFavorList = document.getElementById('divFavorList')
    ulFavorList = document.getElementById('ulFavorList')
    divFavorList.style.display = 'block'

    for (let place of places.places){
        setPlacemarkOnMap(place.id, place.place)
        drawFavorList(place)

    }
    console.log('Объекты загружены из Локалстораджа')
}

function drawFavorList(place){
    const li = document.createElement('li')
    li.id = place.id
    li.innerHTML =
        `<b>${place.place.name}</b>` +
        `<ul>` +
        `<li>${place.place.address}</li>` +
        `<li style="color: #0044bb; cursor: pointer;" onclick="makeRoute(${JSON.stringify(place.place.coords)})">Построить маршрут</li>` +
        `</ul>`
    ulFavorList.appendChild(li)
}

function clearMap(){
    myMap.geoObjects.removeAll()

    divFavorList = document.getElementById('divFavorList')
    ulFavorList = document.getElementById('ulFavorList')
    divFavorList.style.display = 'none'
    ulFavorList.innerHTML = ''
}

// Определение адреса по координатам (обратное геокодирование).
async function getAddress(coords) {
    let myGeocoder = ymaps.geocode(coords)
    myGeocoder.then(function(res) {
        //TODO: Очень хочу разобраться с тем, почему функция не успевает (???) вернуть данные
        console.log('Адрес: ' + res.geoObjects.get(0).getAddressLine())
        return res.geoObjects.get(0).getAddressLine()
    })
}

//User Geoposition from LocalStorage
function showUserLocation(){
    if (loadFromLS('myPos')){
        const coords = JSON.parse(loadFromLS('myPos'))
        const address = getAddress(coords)

        const balloonContent =
            '<b>Мое положение</b>' +
            '<br>Адрес: ' + address +
            '<br>Координаты:' + coords

        let placemark = new ymaps.Placemark(coords, {
                myId: 'myId',
                balloonContent: balloonContent,
            },
            {
                // preset: "islands#circleDotIcon",
                // iconColor: '#ff0000'
                iconLayout: 'default#image',
                iconImageHref: 'https://api-maps.yandex.ru/2.1.79/build/release/images/geolocation/YaRu.svg',
                iconImageSize: [35, 35]
            })
        // console.log(placemark)

        myMap.geoObjects.add(placemark)
        myMap.setZoom(12)
        myMap.panTo(coords)

    }
}

//User Geoposition from Yandex
function getUserLocation(){
    clearMap()
    let location = ymaps.geolocation.get({
        provider: 'browser'
    });
    // Асинхронная обработка ответа.
    location.then(
        function(result) {
            let userAddress = result.geoObjects.get(0).properties.get('text');
            let userCoordinates = result.geoObjects.get(0).geometry.getCoordinates();
            // Показываем позицию на карте
            myMap.panTo(userCoordinates)
            // Пропишем полученный адрес в балуне.
            result.geoObjects.get(0).properties.set({
                myId: 'myId',
                balloonContentBody:
                    '<b>Мое положение</b>' +
                    '<br>Адрес: ' + userAddress +
                    '<br>Координаты:' + userCoordinates,
            })
            //Сохраняем координаты в LocalStorage
            saveToLS('myPos', JSON.stringify(userCoordinates))
            // Добавление местоположения на карту.
            myMap.geoObjects.add(result.geoObjects)
        },
        function(err) {
            console.log('Ошибка: ' + err)
        }
    );
}

// Проложить маршрут от моего местоположения
// https://yandex.ru/dev/jsapi-v2-1/doc/ru/v2-1/dg/concepts/router/multiRouter
function makeRoute(coordsTo){
    // getUserLocation()
    const coordsFrom = JSON.parse(loadFromLS('myPos'))

    // Удалить предыдущий маршрут
    myMap.geoObjects.remove(multiRoute)

    // Построение маршрута.
    multiRoute = new ymaps.multiRouter.MultiRoute({
        referencePoints: [
            coordsFrom,
            coordsTo,
        ],
        params: {
            // Тип маршрута: на общественном транспорте.
            routingMode: "masstransit"
        }
    }, {
        // Автоматически устанавливать границы карты так,
        // чтобы маршрут был виден целиком.
        boundsAutoApply: true
    });
    // Добавление маршрута на карту.
    myMap.geoObjects.add(multiRoute);

}


// --------

// ---- HTML API FileReader ----

function drawUploadPhotoPanel(id){
    const divSendPhoto = document.getElementById('divSendPhoto')

    if (divSendPhoto.hasChildNodes()){
        divSendPhoto.innerHTML = ''
        divSendPhoto.style.display = 'none'
    } else {
        const label = document.createElement('label')
        label.htmlFor = 'image_uploads'
        label.innerHTML = 'Выбрать фото (PNG, JPG)'

        const input = document.createElement('input')
        input.type = 'file'
        input.id = 'image_uploads'
        input.accept = '.jpg, .jpeg, .png'

        divSendPhoto.appendChild(label)
        divSendPhoto.appendChild(input)
        divSendPhoto.style.display = 'block'

        input.addEventListener('change', (e) => {
            const files = e.target.files
            // сохраним количество элементов в files в переменную countFiles
            const countFiles = files.length
            // если количество выбранных файлов больше 0
            if (!countFiles) {
                alert("Не выбран файл!")
                return
            }

            // присваиваем переменной selectedFile ссылку на выбранный файл
            const selectedFile = files[0]

            if (!/^image/.test(selectedFile.type)) {
                alert("Выбранный файл не является изображением!")
                return
            }
            const reader = new FileReader()
            reader.readAsDataURL(selectedFile)

            reader.addEventListener("load", (e) => {

                const imgData = {
                    id: id,
                    fileName: selectedFile.name,
                    fileSize: (selectedFile.size / 1024).toFixed(1),
                    data: e.target.result
                }

                myImages.addImage(imgData)
                // Сохраняем избранное в базу
                saveToLS('myImgs', JSON.stringify(myImages.getImages()))

                divSendPhoto.innerHTML = ''
                divSendPhoto.style.display = 'none'
                const button = document.getElementById('buttonUploadPhoto')
                button.remove()

                // Перерисовываем точки заново
                //TODO: Не уверен, что так делать правильно
                clearMap()
                showFavor(myPlaces)

            })

            reader.addEventListener("error", () => {
                console.error(
                    `При чтении файла произошла ошибка: ${selectedFile.name}`
                )
            })

        })
    }
}


// --------

// ---- HTML API Geolocation ----
function getMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(saveMyPosition, showGeoError)
    } else {
        console.log("Geolocation is not supported by this browser.")
    }
}

function saveMyPosition(position){
    // console.log([position.coords.latitude, position.coords.longitude])
    const infoToSave = [position.coords.latitude, position.coords.longitude]
    saveToLS('myPos', JSON.stringify(infoToSave))
    setPlacemarkOnMap(infoToSave)

}

function showGeoError(error) {
        switch(error.code) {
        case error.PERMISSION_DENIED:
            console.log("User denied the request for Geolocation.")
            break;
        case error.POSITION_UNAVAILABLE:
            console.log("Location information is unavailable.")
            break;
        case error.TIMEOUT:
            console.log("The request to get user location timed out.")
            break;
        case error.UNKNOWN_ERROR:
            console.log("An unknown error occurred.")
            break;
    }
}

// --------

// ---- HTML API LocalStorage ----
function checkLS(){
    //Проверка поддержки LocalStorage браузером
    if (typeof(Storage) !== "undefined") {
        // Code for localStorage/sessionStorage.
        return true
    } else {
        // Sorry! No Web Storage support
        return false
    }
}

function saveToLS(k, v){
    if(checkLS()){
        console.log('Сохраняем данные в локалсторадж')
        localStorage.setItem(k, v)
    } else {
        console.log('LocalStorage не поддердживается в вашем браузере')
    }
}

function loadFromLS(k){
    if(checkLS()){
        // console.log('loadFromLS. k = ' + k + ' v = ' + localStorage.getItem(k))
        return localStorage.getItem(k)
    } else {
        console.log('LocalStorage не поддердживается в вашем браузере')
    }
}

function clearLS(){
    if(checkLS()){
        localStorage.clear()
        console.log('LocalStorage очищен')
    } else {
        console.log('LocalStorage не поддердживается в вашем браузере')
    }
}

// --------


// ---- Тестовые функции ----

function setCenter () {
    myMap.setCenter([57.767265, 40.925358]);
}
function setBounds () {
    // Bounds - границы видимой области карты.
    // Задаются в географических координатах самой юго-восточной и самой северо-западной точек видимой области.
    myMap.setBounds([[37, 38], [39, 40]]);
}
function setTypeAndPan () {
    // Меняем тип карты на "Гибрид".
    myMap.setType('yandex#hybrid');
    // Плавное перемещение центра карты в точку с новыми координатами.
    myMap.panTo([62.915, 34.461], {
        // Задержка между перемещениями.
        delay: 1500
    });
}

//Как из синхронного сделать асинхронный
function countObjects(){
    let result = ymaps.geoQuery(ymaps.geocode('Новосибирск'));
    result.then(function () {
        conslole.log(result)
        conslole.log('Количество найденных объектов: ' + result.getLength());
    }, function () {
        alert('Произошла ошибка.');
    });
}




// //Для отладки асинхронной операции предназначен метод isReady(), возвращающий признак готовности результата:
// let result = ymaps.geoQuery(ymaps.geocode('Иваново'));
// if (!result.isReady()) {
//     result.then(function () {
//         // Обработка данных.
//     });
// } else {
//     // Обработка данных.
// }


// // Функция геокодирования. Ищет виды объектов рядом с позицией
// function searchNPlace(){
//     let myGeocoder = ymaps.geocode(JSON.parse(loadFromLS('myPos')), {kind: 'metro'})
//     myGeocoder.then(function(res) {
//         console.log('Количество объектов: ' + res.geoObjects.getLength())
//
//         myMap.geoObjects.add(res.geoObjects);
//     });
// }


// Просто что-то найти из кода. Каждый раз добавляется кнопка поиска.
// function search(){
//     let searchControl = new ymaps.control.SearchControl({
//         options: {
//             provider: 'yandex#search'
//         }
//     })
//     myMap.controls.add(searchControl)
//     if (myMap){
//         // console.log(searchControl.search('Дворцовая площадь, 2'))
//         console.log(searchControl.search('Красная площадь'))
//     } else {
//         console.log('Please try again')
//     }
// }