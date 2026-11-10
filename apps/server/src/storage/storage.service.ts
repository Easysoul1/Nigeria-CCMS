import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class StorageService {
  private client: S3Client;
  private bucket: string;

  constructor(cfg: ConfigService) {
    this.bucket = cfg.get<string>("MINIO_BUCKET", "ccms-documents");
    this.client = new S3Client({
      endpoint: `${cfg.get<boolean>("MINIO_USE_SSL") ? "https" : "http"}://${cfg.get("MINIO_ENDPOINT")}:${cfg.get("MINIO_PORT")}`,
      region: "us-east-1",
      credentials: {
        accessKeyId: cfg.getOrThrow<string>("MINIO_USER"),
        secretAccessKey: cfg.getOrThrow<string>("MINIO_PASSWORD"),
      },
      forcePathStyle: true,
    });
  }

  get bucketName() {
    return this.bucket;
  }

  async putObject(key: string, body: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async presignedDownload(key: string, ttlSeconds: number) {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn: ttlSeconds });
  }
}
