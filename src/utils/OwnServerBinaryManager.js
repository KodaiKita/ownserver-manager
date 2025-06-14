const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const Logger = require('./Logger');

class OwnServerBinaryManager {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('OwnServerBinaryManager');
    this.githubApiUrl = 'https://api.github.com/repos/Kumassy/ownserver/releases/latest';
    this.binaryDir = '/app/bin';
    this.binaryPath = this.config?.ownserver?.binaryPath || '/app/bin/ownserver';
  }

  /**
   * GitHub APIから最新リリース情報を取得
   */
  async getLatestRelease() {
    try {
      this.logger.info('最新のOwnServerリリース情報を取得中...');
      
      const { stdout } = await execAsync(`curl -s "${this.githubApiUrl}"`);
      const release = JSON.parse(stdout);
      
      if (!release.assets || release.assets.length === 0) {
        throw new Error('リリースアセットが見つかりません');
      }

      // Linux向けのバイナリを探す
      const linuxAssets = release.assets.filter(asset => 
        asset.name.includes('linux') && 
        (asset.name.endsWith('.gz') || asset.name.endsWith('.xz') || asset.name.endsWith('.tar.gz'))
      );

      if (linuxAssets.length === 0) {
        throw new Error('Linux向けのバイナリが見つかりません');
      }

      // 優先順位: .gz > .tar.gz > .xz
      const asset = linuxAssets.find(a => a.name.endsWith('.gz') && !a.name.endsWith('.tar.gz')) ||
                   linuxAssets.find(a => a.name.endsWith('.tar.gz')) ||
                   linuxAssets.find(a => a.name.endsWith('.xz')) ||
                   linuxAssets[0];

      this.logger.info(`最新リリース: ${release.tag_name}, アセット: ${asset.name}`);
      
      return {
        version: release.tag_name,
        downloadUrl: asset.browser_download_url,
        filename: asset.name,
        size: asset.size
      };
    } catch (error) {
      this.logger.error('最新リリース情報の取得に失敗:', error);
      throw error;
    }
  }

  /**
   * バイナリファイルをダウンロード
   */
  async downloadBinary(releaseInfo) {
    try {
      this.logger.info(`OwnServerバイナリをダウンロード中: ${releaseInfo.filename}`);
      
      // binディレクトリを作成
      await fs.mkdir(this.binaryDir, { recursive: true });
      
      const downloadPath = path.join(this.binaryDir, releaseInfo.filename);
      
      // ダウンロード実行
      await execAsync(`curl -L -o "${downloadPath}" "${releaseInfo.downloadUrl}"`);
      
      // ファイルサイズ確認
      const stats = await fs.stat(downloadPath);
      this.logger.info(`ダウンロード完了: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error('ダウンロードしたファイルのサイズが0です');
      }
      
      return downloadPath;
    } catch (error) {
      this.logger.error('バイナリダウンロードに失敗:', error);
      throw error;
    }
  }

  /**
   * 圧縮ファイルを展開
   */
  async extractBinary(archivePath, releaseInfo) {
    try {
      this.logger.info(`アーカイブを展開中: ${releaseInfo.filename}`);
      
      const extractDir = path.join(this.binaryDir, 'extract');
      await fs.mkdir(extractDir, { recursive: true });
      
      let extractCommand;
      if (releaseInfo.filename.endsWith('.tar.gz')) {
        extractCommand = `tar -xzf "${archivePath}" -C "${extractDir}"`;
      } else if (releaseInfo.filename.endsWith('.gz')) {
        // .gzファイル（単一ファイル）の場合
        const extractedName = path.basename(releaseInfo.filename, '.gz');
        extractCommand = `gunzip -c "${archivePath}" > "${path.join(extractDir, extractedName)}"`;
      } else if (releaseInfo.filename.endsWith('.xz')) {
        const extractedName = path.basename(releaseInfo.filename, '.xz');
        extractCommand = `xz -dc "${archivePath}" > "${path.join(extractDir, extractedName)}"`;
      } else {
        throw new Error(`サポートされていない圧縮形式: ${releaseInfo.filename}`);
      }
      
      await execAsync(extractCommand);
      
      // 展開されたファイルを探す
      const extractedFiles = await fs.readdir(extractDir);
      this.logger.info(`展開されたファイル: ${extractedFiles.join(', ')}`);
      
      // ownserverバイナリを探す
      let binaryFile = extractedFiles.find(file => 
        file === 'ownserver' || file.startsWith('ownserver')
      );
      
      if (!binaryFile) {
        // ディレクトリがある場合はその中を探す
        for (const file of extractedFiles) {
          const filePath = path.join(extractDir, file);
          const stat = await fs.stat(filePath);
          if (stat.isDirectory()) {
            const subFiles = await fs.readdir(filePath);
            const subBinary = subFiles.find(f => f === 'ownserver' || f.startsWith('ownserver'));
            if (subBinary) {
              binaryFile = path.join(file, subBinary);
              break;
            }
          }
        }
      }
      
      if (!binaryFile) {
        throw new Error('展開されたファイルの中にownserverバイナリが見つかりません');
      }
      
      const extractedBinaryPath = path.join(extractDir, binaryFile);
      
      // バイナリファイルを最終的な場所にコピー
      await execAsync(`cp "${extractedBinaryPath}" "${this.binaryPath}"`);
      await execAsync(`chmod +x "${this.binaryPath}"`);
      
      // 一時ファイルを削除
      await execAsync(`rm -rf "${extractDir}" "${archivePath}"`);
      
      this.logger.info(`OwnServerバイナリを配置: ${this.binaryPath}`);
      return this.binaryPath;
    } catch (error) {
      this.logger.error('バイナリ展開に失敗:', error);
      throw error;
    }
  }

  /**
   * バイナリのバージョンを確認
   */
  async getBinaryVersion() {
    try {
      const { stdout } = await execAsync(`"${this.binaryPath}" --version 2>/dev/null || echo "unknown"`);
      return stdout.trim();
    } catch (error) {
      this.logger.debug('バイナリバージョン取得エラー:', error.message);
      return 'unknown';
    }
  }

  /**
   * バイナリが存在するかチェック
   */
  async isBinaryExists() {
    try {
      await fs.access(this.binaryPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * OwnServerバイナリを自動取得・インストール
   */
  async installOrUpdateBinary(forceUpdate = false) {
    try {
      this.logger.info('OwnServerバイナリの自動取得を開始...');
      
      const exists = await this.isBinaryExists();
      const currentVersion = exists ? await this.getBinaryVersion() : null;
      
      if (exists && !forceUpdate) {
        this.logger.info(`OwnServerバイナリが既に存在します: ${this.binaryPath} (バージョン: ${currentVersion})`);
        return {
          success: true,
          action: 'skipped',
          version: currentVersion,
          path: this.binaryPath
        };
      }
      
      // 最新リリース情報を取得
      const releaseInfo = await this.getLatestRelease();
      
      if (exists && currentVersion.includes(releaseInfo.version) && !forceUpdate) {
        this.logger.info(`最新バージョンが既にインストールされています: ${currentVersion}`);
        return {
          success: true,
          action: 'up_to_date',
          version: currentVersion,
          path: this.binaryPath
        };
      }
      
      // バイナリをダウンロード
      const downloadPath = await this.downloadBinary(releaseInfo);
      
      // バックアップ（既存バイナリがある場合）
      if (exists) {
        const backupPath = `${this.binaryPath}.backup.${Date.now()}`;
        await execAsync(`mv "${this.binaryPath}" "${backupPath}"`);
        this.logger.info(`既存バイナリをバックアップ: ${backupPath}`);
      }
      
      // バイナリを展開・配置
      await this.extractBinary(downloadPath, releaseInfo);
      
      // インストール確認
      const newVersion = await this.getBinaryVersion();
      
      this.logger.info(`OwnServerバイナリのインストール完了: ${releaseInfo.version} -> ${newVersion}`);
      
      return {
        success: true,
        action: exists ? 'updated' : 'installed',
        version: newVersion,
        path: this.binaryPath,
        releaseInfo
      };
      
    } catch (error) {
      this.logger.error('OwnServerバイナリの自動取得に失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * バイナリの動作確認
   */
  async testBinary() {
    try {
      if (!(await this.isBinaryExists())) {
        return { success: false, error: 'バイナリファイルが存在しません' };
      }
      
      // --helpコマンドでテスト
      const { stdout, stderr } = await execAsync(`"${this.binaryPath}" --help`, { timeout: 5000 });
      
      return {
        success: true,
        version: await this.getBinaryVersion(),
        output: stdout + stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 手動でのバイナリ統合（既存バイナリをシステムに統合）
   */
  async integrateBinary(sourcePath) {
    try {
      this.logger.info(`既存バイナリを統合: ${sourcePath} -> ${this.binaryPath}`);
      
      // ソースファイルの存在確認
      await fs.access(sourcePath);
      
      // バイナリディレクトリを作成
      await fs.mkdir(this.binaryDir, { recursive: true });
      
      // バイナリをコピー
      await execAsync(`cp "${sourcePath}" "${this.binaryPath}"`);
      await execAsync(`chmod +x "${this.binaryPath}"`);
      
      // 動作確認
      const testResult = await this.testBinary();
      
      if (testResult.success) {
        this.logger.info(`バイナリ統合完了: ${testResult.version}`);
        return {
          success: true,
          version: testResult.version,
          path: this.binaryPath
        };
      } else {
        throw new Error(`統合したバイナリの動作確認に失敗: ${testResult.error}`);
      }
      
    } catch (error) {
      this.logger.error('バイナリ統合に失敗:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = OwnServerBinaryManager;
