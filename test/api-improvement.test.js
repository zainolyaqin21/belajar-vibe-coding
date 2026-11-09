import app from "../src/index.js";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING COMPREHENSIVE IMPROVEMENT VERIFICATION");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Uji Registrasi & Login User A dan User B (Multi-tenancy test)
  const timestamp = Date.now();
  const userAEmail = `usera_${timestamp}@test.com`;
  const userBEmail = `userb_${timestamp}@test.com`;
  const password = "password123";

  // Register User A
  const regARes = await app.handle(
    new Request("http://localhost:3000/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "User A", email: userAEmail, password }),
    })
  );
  const regAData = await regARes.json();
  assert(regARes.status === 201 && regAData.success === true, "Register User A berhasil (201)");
  assert(regAData.data.created_at !== undefined, "User response memiliki created_at (bukan time)");

  // Register User B
  const regBRes = await app.handle(
    new Request("http://localhost:3000/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "User B", email: userBEmail, password }),
    })
  );
  assert(regBRes.status === 201, "Register User B berhasil (201)");

  // Login User A
  const loginARes = await app.handle(
    new Request("http://localhost:3000/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userAEmail, password }),
    })
  );
  const loginAData = await loginARes.json();
  const tokenA = loginAData.data || loginAData.token;
  assert(loginARes.status === 200 && !!tokenA, "Login User A berhasil dan menghasilkan token");

  // Login User B
  const loginBRes = await app.handle(
    new Request("http://localhost:3000/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userBEmail, password }),
    })
  );
  const loginBData = await loginBRes.json();
  const tokenB = loginBData.data || loginBData.token;
  assert(loginBRes.status === 200 && !!tokenB, "Login User B berhasil dan menghasilkan token");

  // Current User A via JOIN
  const curARes = await app.handle(
    new Request("http://localhost:3000/api/users/current", {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  );
  const curAData = await curARes.json();
  assert(curARes.status === 200 && curAData.data.email === userAEmail, "GET /api/users/current JOIN query berfungsi");

  // 2. Auth Protection pada route plants & plant-logs (401 Unauthorized tanpa token)
  const noAuthGetPlants = await app.handle(new Request("http://localhost:3000/api/plants"));
  assert(noAuthGetPlants.status === 401, "GET /api/plants menolak request tanpa token (401)");

  const noAuthPostPlant = await app.handle(
    new Request("http://localhost:3000/api/plants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Monstera", tanggal: "2026-01-01" }),
    })
  );
  assert(noAuthPostPlant.status === 401, "POST /api/plants menolak request tanpa token (401)");

  const noAuthGetLogs = await app.handle(new Request("http://localhost:3000/api/plants/1/logs"));
  assert(noAuthGetLogs.status === 401, "GET /api/plants/:id/logs menolak tanpa token (401)");

  const noAuthCrudLog = await app.handle(new Request("http://localhost:3000/api/plants/logs/1"));
  assert(noAuthCrudLog.status === 401, "GET /api/plants/logs/:logId menolak tanpa token (401)");

  // 3. Multi-tenancy & Plants CRUD
  // User A buat tanaman
  const createPlantARes = await app.handle(
    new Request("http://localhost:3000/api/plants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ name: "Monstera Deliciosa", tanggal: "2026-03-01T08:00:00Z" }),
    })
  );
  const createPlantAData = await createPlantARes.json();
  assert(createPlantARes.status === 201 && createPlantAData.success === true, "User A berhasil membuat tanaman");
  const plantAId = createPlantAData.data.id;

  // User B buat tanaman
  const createPlantBRes = await app.handle(
    new Request("http://localhost:3000/api/plants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ name: "Kaktus Mini", tanggal: "2026-03-02T08:00:00Z" }),
    })
  );
  const createPlantBData = await createPlantBRes.json();
  const plantBId = createPlantBData.data.id;
  assert(createPlantBRes.status === 201, "User B berhasil membuat tanaman");

  // User A ambil daftar tanaman -> hanya monstera (bukan kaktus milik user B)
  const listARes = await app.handle(
    new Request("http://localhost:3000/api/plants", {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  );
  const listAData = await listARes.json();
  const hasOnlyA = listAData.data.every((p) => p.name === "Monstera Deliciosa");
  assert(hasOnlyA && listAData.data.length === 1, "Multi-tenancy: User A hanya melihat tanaman miliknya sendiri");

  // User B mencoba akses tanaman milik User A (GET /api/plants/:id) -> 404
  const getPlantBfromA = await app.handle(
    new Request(`http://localhost:3000/api/plants/${plantAId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
  );
  assert(getPlantBfromA.status === 404, "User B dilarang mengambil tanaman milik User A (404)");

  // User A ambil tanaman miliknya (GET /api/plants/:id) -> 200
  const getPlantA = await app.handle(
    new Request(`http://localhost:3000/api/plants/${plantAId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  );
  const getPlantAData = await getPlantA.json();
  assert(getPlantA.status === 200 && getPlantAData.data.id === plantAId, "GET /api/plants/:id milik sendiri berhasil (200)");

  // 4. Guard update kosong (error 400)
  const emptyUpdatePlant = await app.handle(
    new Request(`http://localhost:3000/api/plants/${plantAId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({}),
    })
  );
  assert(emptyUpdatePlant.status === 400, "Update tanaman dengan payload kosong ditolak (400)");

  // 5. Pagination tanaman
  const paginatedPlantsRes = await app.handle(
    new Request("http://localhost:3000/api/plants?page=1&limit=5", {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  );
  const paginatedPlantsData = await paginatedPlantsRes.json();
  assert(
    paginatedPlantsRes.status === 200 &&
      paginatedPlantsData.pagination &&
      paginatedPlantsData.pagination.page === 1,
    "Pagination pada GET /api/plants?page=1&limit=5 berfungsi"
  );

  // 6. Logs & File Upload Validation
  // Buat dummy buffer gambar JPEG valid (FF D8 FF)
  const validJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const validJpegBlob = new Blob([validJpegBytes], { type: "image/jpeg" });

  const formDataValid = new FormData();
  formDataValid.append("catatan", "Tunas baru mulai tumbuh");
  formDataValid.append("foto", validJpegBlob, "daun.jpg");

  const addLogRes = await app.handle(
    new Request(`http://localhost:3000/api/plants/${plantAId}/logs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formDataValid,
    })
  );
  const addLogData = await addLogRes.json();
  assert(addLogRes.status === 201 && addLogData.success === true, "POST log dengan foto valid berhasil (201)");
  const logId = addLogData.data.id;
  const initialFotoPath = addLogData.data.foto;
  assert(!!initialFotoPath && initialFotoPath.startsWith("/uploads/"), "Foto tersimpan di path /uploads/");

  // Validasi file bukan gambar (magic bytes salah) -> harus 400
  const fakeImageBytes = new TextEncoder().encode("ini file script berbahaya berkedok foto");
  const fakeBlob = new Blob([fakeImageBytes], { type: "image/jpeg" });
  const formFake = new FormData();
  formFake.append("catatan", "Coba upload palsu");
  formFake.append("foto", fakeBlob, "exploit.jpg");

  const fakeUploadRes = await app.handle(
    new Request(`http://localhost:3000/api/plants/${plantAId}/logs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formFake,
    })
  );
  assert(fakeUploadRes.status === 400, "Validasi magic bytes menolak file berbahaya/palsu (400)");

  // Validasi ukuran melebihi 5MB -> harus 400
  const largeBytes = new Uint8Array(6 * 1024 * 1024); // 6MB
  largeBytes[0] = 0xff;
  largeBytes[1] = 0xd8;
  largeBytes[2] = 0xff;
  const largeBlob = new Blob([largeBytes], { type: "image/jpeg" });
  const formLarge = new FormData();
  formLarge.append("catatan", "File terlalu besar");
  formLarge.append("foto", largeBlob, "huge.jpg");

  const largeUploadRes = await app.handle(
    new Request(`http://localhost:3000/api/plants/${plantAId}/logs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formLarge,
    })
  );
  assert(largeUploadRes.status === 400, "Validasi ukuran menolak berkas > 5MB (400)");

  // 7. GET /api/plants/logs/:logId (Endpoint baru)
  const getSingleLog = await app.handle(
    new Request(`http://localhost:3000/api/plants/logs/${logId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  );
  const getSingleLogData = await getSingleLog.json();
  assert(getSingleLog.status === 200 && getSingleLogData.data.id === logId, "GET /api/plants/logs/:logId berhasil (200)");

  // User B mencoba akses log User A -> 404
  const getSingleLogB = await app.handle(
    new Request(`http://localhost:3000/api/plants/logs/${logId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
  );
  assert(getSingleLogB.status === 404, "User B dilarang mengambil log milik User A (404)");

  // 8. Update log & penghapusan foto lama
  // Buat foto kedua
  const validPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const validPngBlob = new Blob([validPngBytes], { type: "image/png" });
  const formUpdateLog = new FormData();
  formUpdateLog.append("catatan", "Catatan telah diupdate");
  formUpdateLog.append("foto", validPngBlob, "updated.png");

  const updateLogRes = await app.handle(
    new Request(`http://localhost:3000/api/plants/logs/${logId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formUpdateLog,
    })
  );
  const updateLogData = await updateLogRes.json();
  assert(updateLogRes.status === 200 && updateLogData.success === true, "PUT /api/plants/logs/:logId berhasil");
  assert(updateLogData.data.foto !== initialFotoPath, "Foto baru tersimpan dengan path baru");

  // Guard update log kosong -> 400
  const emptyUpdateLog = await app.handle(
    new Request(`http://localhost:3000/api/plants/logs/${logId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({}),
    })
  );
  assert(emptyUpdateLog.status === 400, "Update log tanpa perubahan ditolak (400)");

  // 9. Pagination & Pengurutan Logs
  const listLogsRes = await app.handle(
    new Request(`http://localhost:3000/api/plants/${plantAId}/logs?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  );
  const listLogsData = await listLogsRes.json();
  assert(
    listLogsRes.status === 200 && listLogsData.pagination && listLogsData.pagination.page === 1,
    "GET /api/plants/:id/logs mendukung query pagination ?page=1&limit=5"
  );

  // 10. Delete log & pembersihan foto
  const deleteLogRes = await app.handle(
    new Request(`http://localhost:3000/api/plants/logs/${logId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  );
  assert(deleteLogRes.status === 200, "DELETE /api/plants/logs/:logId berhasil (200)");

  // 11. Delete plant
  const deletePlantRes = await app.handle(
    new Request(`http://localhost:3000/api/plants/${plantAId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  );
  assert(deletePlantRes.status === 200, "DELETE /api/plants/:id berhasil (200)");

  // 12. Unifikasi Response Error Shape
  const error404Test = await app.handle(
    new Request("http://localhost:3000/api/plants/99999", {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  );
  const error404Data = await error404Test.json();
  assert(
    error404Test.status === 404 &&
      error404Data.success === false &&
      typeof error404Data.message === "string",
    "Format response error seragam: { success: false, message: '...' }"
  );

  console.log("==================================================");
  console.log(`🏁 HASIL VERIFIKASI: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});
