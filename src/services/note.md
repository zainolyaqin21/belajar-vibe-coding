Buatkan issue.md yang berisi perencanaan untuk nanti di implementasikan oleh junior programmer atau AI model yang lebih murah.

💡

Isi dari planning nya adalah sebagai berikut :

buatkan api untuk log out user 

Endpoint : delete/api/user/logout

Request Body 
Response Body (Success) :

json
{
    "data" : "ok"
}


Response Body (Error) :

json
{
    "error" : "unauthorized"
}


Struktur Folder di dalam src

* routes : ini berisi routing elysia js
* services : ini berisi logic bisnis aplikasi

Struktur file

* routes : menggunakan format misal users-route.ts
* services : menggunakan format misal users-service.ts