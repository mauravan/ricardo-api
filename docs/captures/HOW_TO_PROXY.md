# How to proxy

## 1. Start the AVD with a writable system

Stop the emulator, then from your SDK's emulator directory:

```bash
./emulator -avd YOUR_AVD_NAME -writable-system
```

Then:

```bash
adb root
adb remount
```

You don't actually want to modify the APEX itself; Android 14 keeps that APEX immutable. Instead, we'll create a writable CA directory and bind-mount it into the Conscrypt APEX namespace.

---

## 2. Prepare the mitmproxy certificate

On your computer:

```bash
openssl x509 \
  -in ~/.mitmproxy/mitmproxy-ca-cert.pem \
  -outform DER \
  -out mitmproxy.der
```

Get the old-style Android subject hash:

```bash
HASH=$(openssl x509 \
  -inform DER \
  -in mitmproxy.der \
  -subject_hash_old \
  -noout)

echo "$HASH"
```

Then:

```bash
mv mitmproxy.der "$HASH.0"
```

For example:

```
c8750f0d.0
```

---

## 3. Push it to the emulator

```bash
adb push "$HASH.0" /data/local/tmp/"$HASH.0"
```

Now open a root shell:

```bash
adb shell
```

and:

```bash
su
```

---

## 4. Build a CA directory containing the normal system CAs + mitmproxy

This is important: don't replace the existing CA set with only your mitmproxy certificate, otherwise you'll break normal HTTPS validation.

Inside the root shell:

```bash
mkdir -p -m 700 /data/local/tmp/tmp-ca-copy
```

```bash
cp /apex/com.android.conscrypt/cacerts/* \
   /data/local/tmp/tmp-ca-copy/
```

```bash
mount -t tmpfs tmpfs /system/etc/security/cacerts
```

```bash
mv /data/local/tmp/tmp-ca-copy/* \
   /system/etc/security/cacerts/
```

```bash
mv /data/local/tmp/$HASH.0 \
   /system/etc/security/cacerts/
```

Then permissions/SELinux:

```bash
chown root:root /system/etc/security/cacerts/*
chmod 644 /system/etc/security/cacerts/*
chcon u:object_r:system_file:s0 /system/etc/security/cacerts/*
```

This follows the Android 14 workaround where the normal system CA directory becomes the writable source used to overlay Conscrypt's APEX CA directory.

---

## 5. Inject it into Zygote

Still in the root shell:

```bash
ZYGOTE_PID=$(pidof zygote || true)
ZYGOTE64_PID=$(pidof zygote64 || true)

for Z_PID in "$ZYGOTE_PID" "$ZYGOTE64_PID"; do
    if [ -n "$Z_PID" ]; then
        nsenter --mount=/proc/$Z_PID/ns/mnt -- \
            /bin/mount --bind \
            /system/etc/security/cacerts \
            /apex/com.android.conscrypt/cacerts
    fi
done
```

The reason this is necessary is subtle: `/apex` has private mount propagation, and Android apps inherit their mount namespace from Zygote. Simply mounting something over the APEX from your adb shell namespace won't affect apps.

---

## 6. Restart your target app

At minimum, kill/restart the app you're intercepting so its process gets the modified mount namespace:

```bash
adb shell am force-stop com.example.yourapp
```

Then launch it again.

You can check the injected directory from a newly launched process, or simply test HTTPS traffic through mitmproxy.
