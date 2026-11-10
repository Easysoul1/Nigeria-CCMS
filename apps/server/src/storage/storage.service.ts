import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Object storage for case documents.
 *
 * MinIO/S3 is optional. The app must boot and serve case data, filings,
 * hearings, rulings and the public tracker without object storage. Only the
 * document endpoints depend on it, so we defer both the S3 client construction
 * and any validation until the first real use. Callers get a 503 with a
 * specific message instead of a 500 “something went wrong”.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;
  private readonly client: S3Client | null;
  private readonly unavailableReason: string | null;

  constructor(cfg: ConfigService) {
    this.bucket = cfg.get<string>("MINIO_BUCKET", "ccms-documents");

    const endpoint = cfg.get<string>("MINIO_ENDPOINT");
    const user = cfg.get<string>("MINIO_USER");
    const password = cfg.get<string>("MINIO_PASSWORD");

    if (!endpoint || !user || !password) {
      this.client = null;
      this.unavailableReason =
        "Object storage is not configured (MINIO_ENDPOINT, MINIO_USER, MINIO_PASSWORD).";
      this.logger.warn(
        `${this.unavailableReason} Document upload/download will return 503.`,
      );
      return;
    }

    this.client = new S3Client({
      endpoint: `${cfg.get<boolean>("MINIO_USE_SSL") ? "https" : "http"}://${endpoint}:${cfg.get<number>("MINIO_PORT", 9000)}`,
      region: "us-east-1",
      credentials: { accessKeyId: user, secretAccessKey: password },
      forcePathStyle: true,
    });
    this.unavailableReason = null;
  }

  get bucketName() {
    return this.bucket;
  }

  /** Throws a 503 if the storage backend is not configured. */
  private requireClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: "STORAGE_UNAVAILABLE",
        message:
          this.unavailableReason ??
          "Object storage is not available.",
      });
    }
    return this.client;
  }

  async putObject(key: string, body: Buffer, contentType: string) {
    const client = this.requireClient();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async presignedDownload(key: string, ttlSeconds: number) {
    const client = this.requireClient();
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(client, cmd, { expiresIn: ttlSeconds });
  }
}
