"""
MinIO/S3 obyekt ombori uchun yengil yordamchi.

Loyihada boto3/django-storages allaqachon requirements'da bor edi, lekin
hech qayerda haqiqiy klient kodi yozilmagan edi (faqat health-check orqali
MinIO'ning ishga tushganligi tekshirilardi). Bu modul minimal, ishlatishga
tayyor yuklash funksiyasini beradi — masalan sertifikat PDF'lari uchun.
"""
import logging
import os

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

logger = logging.getLogger("utils.storage")

# AWS SigV4 (va shu bilan MinIO) imzolangan URL'lar uchun qat'iy limit —
# undan oshsa server "X-Amz-Expires must be less than a week" xatosi bilan
# so'rovni butunlay rad etadi.
MAX_EXPIRES_SECONDS = 7 * 24 * 3600


def _make_client(endpoint: str):
    return boto3.client(
        "s3",
        endpoint_url=f"http://{endpoint}",
        aws_access_key_id=os.environ.get("MINIO_ROOT_USER", "minioadmin"),
        aws_secret_access_key=os.environ.get("MINIO_ROOT_PASSWORD", ""),
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def get_s3_client():
    """Ichki (konteynerlar ichidagi) MinIO endpoint'iga ulangan boto3 klient."""
    return _make_client(os.environ.get("MINIO_ENDPOINT", "minio:9000"))


def _ensure_bucket(client, bucket: str) -> None:
    try:
        client.head_bucket(Bucket=bucket)
    except ClientError:
        client.create_bucket(Bucket=bucket)


def upload_bytes(bucket: str, key: str, data: bytes, content_type: str, expires_in: int = MAX_EXPIRES_SECONDS) -> str:
    """
    `data`ni MinIO'dagi `bucket/key`ga yuklaydi (bucket bo'lmasa yaratadi)
    va vaqtinchalik (`expires_in` soniya, standart 7 kun) yuklab olish
    havolasini qaytaradi.

    MINIO_PUBLIC_ENDPOINT muhit o'zgaruvchisi berilgan bo'lsa (masalan
    "cert.osiyo-nigohi.uz" yoki nginx orqali proksilangan manzil), havola
    o'sha endpoint uchun ALOHIDA klient bilan qayta imzolanadi — chunki
    MINIO_ENDPOINT odatda faqat Docker tarmog'i ichidan ("minio:9000")
    ochiladi, brauzerdan emas. (Imzolangan URL'dagi hostni oddiy matn sifatida
    almashtirish ishlamaydi — SigV4 imzosi Host sarlavhasini ham qamrab oladi,
    shuning uchun host o'zgarsa imzo ham noto'g'ri bo'lib qoladi.)
    """
    if expires_in > MAX_EXPIRES_SECONDS:
        logger.warning(
            "expires_in=%s MAX_EXPIRES_SECONDS (%s) dan katta — %s'ga qisqartirildi (%s)",
            expires_in, MAX_EXPIRES_SECONDS, MAX_EXPIRES_SECONDS, key,
        )
        expires_in = MAX_EXPIRES_SECONDS

    client = get_s3_client()
    _ensure_bucket(client, bucket)
    client.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)

    public_host = os.environ.get("MINIO_PUBLIC_ENDPOINT")
    presign_client = _make_client(public_host) if public_host else client
    if not public_host:
        logger.warning(
            "MINIO_PUBLIC_ENDPOINT sozlanmagan — yuklangan fayl havolasi "
            "faqat Docker tarmog'i ichidan ochiladi (%s)", key,
        )

    return presign_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )
