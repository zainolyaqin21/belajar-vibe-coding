import app from "../src/index.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 TESTING USER PROFILE & ACCOUNT MANAGEMENT (ISSUE #30)");
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

  const timestamp = Date.now();
  const testEmail = `farmer_${timestamp}@test.com`;
  const initialPassword = "password123";

  // 1. Register User
  const regRes = await app.handle(
    new Request("http://localhost:3000/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Petani Jagung", email: testEmail, password: initialPassword }),
    })
  );
  const regData = await regRes.json();
  assert(regRes.status === 201 && regData.success === true, "Registrasi user baru berhasil (201)");

  // 2. Login User
  const loginRes = await app.handle(
    new Request("http://localhost:3000/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: initialPassword }),
    })
  );
  const loginData = await loginRes.json();
  const token = loginData.data || loginData.token;
  assert(loginRes.status === 200 && !!token, "Login berhasil dan token didapatkan");

  // 3. GET /api/user/profile (Auth check)
  const noAuthProfile = await app.handle(new Request("http://localhost:3000/api/user/profile"));
  assert(noAuthProfile.status === 401, "GET /api/user/profile tanpa token ditolak (401)");

  const profileRes = await app.handle(
    new Request("http://localhost:3000/api/user/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
  const profileData = await profileRes.json();
  assert(
    profileRes.status === 200 &&
    profileData.success === true &&
    profileData.data.name === "Petani Jagung" &&
    profileData.data.password === undefined,
    "GET /api/user/profile berhasil mengembalikan data tanpa eksposur password"
  );

  // 4. GET /api/user/profil (Alias check)
  const profilAliasRes = await app.handle(
    new Request("http://localhost:3000/api/user/profil", {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
  const profilAliasData = await profilAliasRes.json();
  assert(
    profilAliasRes.status === 200 && profilAliasData.data.name === "Petani Jagung",
    "GET /api/user/profil (alias) berhasil"
  );

  // 5. PUT /api/user/profile
  const updateProfileRes = await app.handle(
    new Request("http://localhost:3000/api/user/profile", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Petani Jagung Organik" }),
    })
  );
  const updateProfileData = await updateProfileRes.json();
  assert(
    updateProfileRes.status === 200 &&
    updateProfileData.success === true &&
    updateProfileData.data.name === "Petani Jagung Organik",
    "PUT /api/user/profile berhasil memperbarui nama profil"
  );

  // 6. POST /api/user/avatar (Upload Pertama)
  // Membuat mock PNG image byte buffer (valid 1x1 png)
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);

  const formData1 = new FormData();
  formData1.append("avatar", new File([pngHeader], "avatar1.png", { type: "image/png" }));

  const avatarRes1 = await app.handle(
    new Request("http://localhost:3000/api/user/avatar", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData1,
    })
  );
  const avatarData1 = await avatarRes1.json();
  const firstAvatarUrl = avatarData1.data?.avatar;
  const firstAvatarFile = firstAvatarUrl ? join(process.cwd(), "public", firstAvatarUrl.replace(/^\//, "")) : "";
  assert(
    avatarRes1.status === 200 &&
    avatarData1.success === true &&
    !!firstAvatarUrl &&
    existsSync(firstAvatarFile),
    "POST /api/user/avatar pertama berhasil dan file tersimpan di disk"
  );

  // 7. POST /api/user/avatar (Upload Kedua: Memastikan Foto Lama Dihapus)
  const formData2 = new FormData();
  formData2.append("avatar", new File([pngHeader], "avatar2.png", { type: "image/png" }));

  const avatarRes2 = await app.handle(
    new Request("http://localhost:3000/api/user/avatar", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData2,
    })
  );
  const avatarData2 = await avatarRes2.json();
  const secondAvatarUrl = avatarData2.data?.avatar;
  const secondAvatarFile = secondAvatarUrl ? join(process.cwd(), "public", secondAvatarUrl.replace(/^\//, "")) : "";

  const oldFileDeleted = !existsSync(firstAvatarFile);
  const newFileExists = existsSync(secondAvatarFile);

  assert(
    avatarRes2.status === 200 &&
    avatarData2.success === true &&
    oldFileDeleted &&
    newFileExists,
    "POST /api/user/avatar kedua berhasil dan OTOMATIS MENGHAPUS berkas avatar lama"
  );

  // 8. PUT /api/user/change_password (Validasi Password Lama Salah)
  const wrongOldPassRes = await app.handle(
    new Request("http://localhost:3000/api/user/change_password", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        oldPassword: "salahPasswordnya",
        newPassword: "newSecretPassword123",
        confirmPassword: "newSecretPassword123",
      }),
    })
  );
  const wrongOldPassData = await wrongOldPassRes.json();
  assert(
    wrongOldPassRes.status === 400 && wrongOldPassData.success === false,
    "PUT /api/user/change_password menolak jika password lama salah (400)"
  );

  // 9. PUT /api/user/change_password (Berhasil Ubah Password)
  const newPassword = "newSecretPassword123";
  const changePassRes = await app.handle(
    new Request("http://localhost:3000/api/user/change_password", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        oldPassword: initialPassword,
        newPassword: newPassword,
        confirmPassword: newPassword,
      }),
    })
  );
  const changePassData = await changePassRes.json();
  assert(
    changePassRes.status === 200 && changePassData.success === true,
    "PUT /api/user/change_password berhasil mengubah password"
  );

  // 10. Login dengan password baru
  const loginNewRes = await app.handle(
    new Request("http://localhost:3000/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: newPassword }),
    })
  );
  const loginNewData = await loginNewRes.json();
  assert(
    loginNewRes.status === 200 && !!(loginNewData.data || loginNewData.token),
    "Login berhasil menggunakan password baru yang telah diubah"
  );

  // 11. Cek Halaman HTML Statis Tersedia
  const profileHtmlRes = await app.handle(new Request("http://localhost:3000/profile.html"));
  assert(profileHtmlRes.status === 200, "Frontend /profile.html dapat diakses (200)");

  console.log("==================================================");
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});

