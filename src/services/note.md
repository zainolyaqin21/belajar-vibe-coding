Buatkan issue.md yang berisi perencanaan untuk nanti di implementasikan oleh junior programmer atau AI model yang lebih murah.

💡

Isi dari planning nya adalah sebagai berikut :

buat tabel sessions:

* id integer auto increment
* token varchar 255 not null (isinya UUID untuk token user yang login)
* user_id integer (FK ke tabel users)
* created_at timestamp default current_timestamp

buatkan API untuk registrasi login user

Endpoint : POST /api/users/login

Request Body 

json
{
    "email" : "eko@localhost",
    "password" : "rahasia"
}


Response Body (Success) :

json
{
    "data" : "token"
}


Response Body (Error) :

json
{
    "error" : "Email atau password salah"
}


Struktur Folder di dalam src

* routes : ini berisi routing elysia js
* services : ini berisi logic bisnis aplikasi

Struktur file

* routes : menggunakan format misal users-route.ts
* services : menggunakan format misal users-service.ts