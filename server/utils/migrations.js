const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * مدير الترحيلات لقاعدة البيانات
 */
class MigrationManager {
  constructor(db) {
    this.db = db;
    this.migrationsPath = path.join(__dirname, '..', 'migrations');
  }

  /**
   * تطبيق جميع الترحيلات المطلوبة
   */
  async applyMigrations() {
    try {
      console.log('[MIGRATIONS] Starting database migration check...');
      
      // الحصول على إصدار قاعدة البيانات الحالي
      const currentVersion = await this.getCurrentVersion();
      console.log(`[MIGRATIONS] Current database version: ${currentVersion}`);
      
      // الحصول على ملفات الترحيل المتاحة
      const migrationFiles = this.getMigrationFiles();
      console.log(`[MIGRATIONS] Found ${migrationFiles.length} migration files`);
      
      // تطبيق الترحيلات المطلوبة
      let appliedCount = 0;
      
      for (const migrationFile of migrationFiles) {
        const migrationVersion = this.extractVersionFromFilename(migrationFile);
        
        if (migrationVersion > currentVersion) {
          console.log(`[MIGRATIONS] Applying migration: ${migrationFile}`);
          
          const startTime = Date.now();
          await this.applyMigration(migrationFile);
          const executionTime = Date.now() - startTime;
          
          // تحديث إصدار قاعدة البيانات
          await this.updateVersion(migrationVersion);
          
          // تسجيل الترحيل في التاريخ
          await this.recordMigration(migrationFile, executionTime);
          
          appliedCount++;
          console.log(`[MIGRATIONS] ✅ Applied ${migrationFile} in ${executionTime}ms`);
        }
      }
      
      if (appliedCount > 0) {
        console.log(`[MIGRATIONS] ✅ Applied ${appliedCount} migrations successfully`);
      } else {
        console.log('[MIGRATIONS] ✅ Database is up to date');
      }
      
    } catch (error) {
      console.error('[MIGRATIONS] ❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * الحصول على إصدار قاعدة البيانات الحالي
   */
  async getCurrentVersion() {
    return new Promise((resolve, reject) => {
      this.db.get('PRAGMA user_version', (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.user_version || 0);
        }
      });
    });
  }

  /**
   * تحديث إصدار قاعدة البيانات
   */
  async updateVersion(version) {
    return new Promise((resolve, reject) => {
      this.db.run(`PRAGMA user_version = ${version}`, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * الحصول على ملفات الترحيل مرتبة
   */
  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsPath)) {
      console.log('[MIGRATIONS] No migrations directory found, creating...');
      fs.mkdirSync(this.migrationsPath, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort(); // ترتيب أبجدي

    return files;
  }

  /**
   * استخراج رقم الإصدار من اسم الملف
   */
  extractVersionFromFilename(filename) {
    const match = filename.match(/^(\d+)_/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * تطبيق ترحيل واحد
   */
  async applyMigration(filename) {
    const filePath = path.join(this.migrationsPath, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // حساب checksum للتحقق من التكامل
    const checksum = crypto.createHash('md5').update(sql).digest('hex');
    
    return new Promise((resolve, reject) => {
      // تنفيذ SQL في transaction
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // تقسيم SQL إلى statements منفصلة
        const statements = this.splitSqlStatements(sql);
        
        let completed = 0;
        const total = statements.length;
        
        if (total === 0) {
          this.db.run('COMMIT');
          resolve();
          return;
        }
        
        statements.forEach((statement, index) => {
          if (statement.trim()) {
            this.db.run(statement, (err) => {
              if (err) {
                console.error(`[MIGRATIONS] Error in statement ${index + 1}:`, statement);
                this.db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              completed++;
              if (completed === total) {
                this.db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    reject(commitErr);
                  } else {
                    resolve();
                  }
                });
              }
            });
          } else {
            completed++;
            if (completed === total) {
              this.db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  reject(commitErr);
                } else {
                  resolve();
                }
              });
            }
          }
        });
      });
    });
  }

  /**
   * تقسيم SQL إلى statements منفصلة
   */
  splitSqlStatements(sql) {
    // إزالة التعليقات والأسطر الفارغة
    const cleanSql = sql
      .replace(/\/\*[\s\S]*?\*\//g, '') // إزالة /* */ comments
      .replace(/--.*$/gm, '') // إزالة -- comments
      .replace(/^\s*$/gm, ''); // إزالة الأسطر الفارغة
    
    // تقسيم على semicolon مع تجاهل semicolons داخل strings
    const statements = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < cleanSql.length; i++) {
      const char = cleanSql[i];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
      } else if (!inString && char === ';') {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
        continue;
      }
      
      current += char;
    }
    
    // إضافة آخر statement إذا لم ينته بـ semicolon
    if (current.trim()) {
      statements.push(current.trim());
    }
    
    return statements;
  }

  /**
   * تسجيل الترحيل في التاريخ
   */
  async recordMigration(filename, executionTime) {
    const filePath = path.join(this.migrationsPath, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    const checksum = crypto.createHash('md5').update(sql).digest('hex');
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO migration_history 
         (migration_name, applied_at, checksum, execution_time) 
         VALUES (?, ?, ?, ?)`,
        [filename, new Date().toISOString(), checksum, executionTime],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * الحصول على تاريخ الترحيلات
   */
  async getMigrationHistory() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM migration_history ORDER BY applied_at DESC',
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * التحقق من تكامل قاعدة البيانات
   */
  async verifyIntegrity() {
    return new Promise((resolve, reject) => {
      this.db.get('PRAGMA integrity_check', (err, row) => {
        if (err) {
          reject(err);
        } else {
          const isValid = row.integrity_check === 'ok';
          resolve(isValid);
        }
      });
    });
  }
}

module.exports = MigrationManager;