declare module 'cloudinary' {
  export namespace v2 {
    function config(options: {
      cloud_name: string;
      api_key: string;
      api_secret: string;
    }): void;

    namespace uploader {
      function upload(
        file: string,
        options?: {
          folder?: string;
          public_id?: string;
          resource_type?: 'image' | 'raw' | 'auto';
          overwrite?: boolean;
        },
      ): Promise<UploadResult>;

      function destroy(
        publicId: string,
        options?: { resource_type?: 'image' | 'raw' },
      ): Promise<{ result: string }>;
    }
  }

  interface UploadResult {
    public_id: string;
    secure_url: string;
    format: string;
    bytes: number;
    created_at: string;
    resource_type: string;
  }
}
