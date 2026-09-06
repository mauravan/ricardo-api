#!/usr/bin/env bash
# One-shot Android 14 MITM proxy setup for AVD.
# Usage: edit vars, start AVD with -writable-system first.
set -euo pipefail

AVD_NAME="${AVD:-YOUR_AVD_NAME}"
APP_PACKAGE="${APP:-com.example.yourapp}"
CERT_PEM="${CERT_PEM:-$HOME/.mitmproxy/mitmproxy-ca-cert.pem}"
MITM_DER="mitmproxy.der"

echo "=== Step 1: writable-system AVD (manual) ==="
echo "Run: ./emulator -avd $AVD_NAME -writable-system"
echo "Then: adb root && adb remount"

echo "=== Step 2: prepare cert ==="
openssl x509 -in "$CERT_PEM" -outform DER -out "$MITM_DER"
HASH=$(openssl x509 -inform DER -in "$MITM_DER" -subject_hash_old -noout)
echo "Hash: $HASH"
mv "$MITM_DER" "${HASH}.0"

echo "=== Step 3: push CA ==="
adb push "${HASH}.0" "/data/local/tmp/${HASH}.0"

echo "=== Step 4: build CA dir + permissions ==="
adb shell su -c "
mkdir -p -m 700 /data/local/tmp/tmp-ca-copy && \
cp /apex/com.android.conscrypt/cacerts/* /data/local/tmp/tmp-ca-copy/ && \
mount -t tmpfs tmpfs /system/etc/security/cacerts && \
mv /data/local/tmp/tmp-ca-copy/* /system/etc/security/cacerts/ && \
mv /data/local/tmp/${HASH}.0 /system/etc/security/cacerts/ && \
chown root:root /system/etc/security/cacerts/* && \
chmod 644 /system/etc/security/cacerts/* && \
chcon u:object_r:system_file:s0 /system/etc/security/cacerts/*"

echo "=== Step 5: inject into zygote ==="
adb shell su -c '
ZYGOTE_PID=$(pidof zygote || true); ZYGOTE64_PID=$(pidof zygote64 || true);
for Z_PID in "$ZYGOTE_PID" "$ZYGOTE64_PID"; do
  [ -n "$Z_PID" ] && nsenter --mount=/proc/$Z_PID/ns/mnt -- /bin/mount --bind /system/etc/security/cacerts /apex/com.android.conscrypt/cacerts
done'

echo "=== Step 6: restart app ==="
adb shell am force-stop "$APP_PACKAGE"
echo "Launch $APP_PACKAGE manually, then test via mitmproxy."
