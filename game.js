window.onload = function() {
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      backgroundColor: '#1a1a1a',  // Darker background to match the grid
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      scene: [MenuScene, MainScene, VictoryScene, DefeatScene]
    };
  
    new Phaser.Game(config);
};

class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // Add title
        this.add.text(centerX, centerY - 100, 'Tower Defense', {
            font: '64px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Create modern start button
        const buttonWidth = 200;
        const buttonHeight = 60;
        
        // Add gradient glow effect behind button
        const glow = this.add.rectangle(centerX, centerY + 50, buttonWidth + 20, buttonHeight + 20, 0x8800ff, 0.2)
            .setOrigin(0.5)
            .setBlendMode(Phaser.BlendModes.ADD);

        // Create multiple borders for gradient effect
        const borders = [];
        const borderCount = 4;
        for(let i = 0; i < borderCount; i++) {
            const scale = 1 + (i * 0.01);
            const alpha = 0.5 - (i * 0.1);
            const border = this.add.rectangle(centerX, centerY + 50, buttonWidth, buttonHeight, 0x8800ff, alpha)
                .setOrigin(0.5)
                .setScale(scale)
                .setStrokeStyle(2, 0x8800ff);
            borders.push(border);
        }
        
        // Button background with gradient
        const button = this.add.rectangle(centerX, centerY + 50, buttonWidth, buttonHeight, 0x222222)
            .setOrigin(0.5)
            .setInteractive();

        // Button text with shadow
        const buttonText = this.add.text(centerX, centerY + 50, 'START GAME', {
            font: 'bold 24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5)
          .setShadow(0, 0, '#8800ff', 8, true, true);

        // Pulse animation for glow and borders
        this.tweens.add({
            targets: [glow, ...borders],
            alpha: '+=0.2',
            yoyo: true,
            duration: 1500,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Button hover effects
        button.on('pointerover', () => {
            button.setFillStyle(0x444444);
            buttonText.setScale(1.1);
            glow.setAlpha(0.5);
            borders.forEach((border, i) => {
                border.setAlpha(0.7 - (i * 0.15));
            });
            this.tweens.add({
                targets: [button, ...borders, buttonText],
                y: centerY + 45,
                duration: 100
            });
        });

        button.on('pointerout', () => {
            button.setFillStyle(0x222222);
            buttonText.setScale(1);
            glow.setAlpha(0.2);
            borders.forEach((border, i) => {
                border.setAlpha(0.5 - (i * 0.1));
            });
            this.tweens.add({
                targets: [button, ...borders, buttonText],
                y: centerY + 50,
                duration: 100
            });
        });

        // Click effect
        button.on('pointerdown', () => {
            button.setFillStyle(0x111111);
            this.tweens.add({
                targets: [button, ...borders, buttonText],
                y: centerY + 52,
                duration: 50,
                onComplete: () => {
                    this.scene.start('MainScene');
                }
            });
        });
    }
}

class MainScene extends Phaser.Scene {
    constructor() {
      super("MainScene");
    }
  
    preload() {
      // Create a simple enemy texture: a red circle.
      // (You can replace this with actual sprite loading, e.g. this.load.image('enemy', 'enemy.png');)
      let enemyGfx = this.make.graphics({ x: 0, y: 0, add: false });
      enemyGfx.fillStyle(0xff0000, 1);
      enemyGfx.fillCircle(15, 15, 15);
      enemyGfx.generateTexture('enemy', 30, 30);
      enemyGfx.destroy();
  
      // If you have actual turret sprites, load them here:
      // Look here for free game assets https://itch.io/game-assets/free/tag-turret
      // this.load.image('turret1', 'path/to/turret1.png');
      // this.load.image('turret2', 'path/to/turret2.png');
      // etc.
    }
  
    create() {
      // Create UI background bars
      this.createUIBars();

      // Define the game area excluding UI bars
      this.gameArea = {
        x: 0,
        y: 60, // Below top UI bar
        width: 800,
        height: 480 // Leaves space for bottom UI
      };
  
      // Update path to start enemies on the path properly
      const pathY = this.gameArea.y + 100; // Moved down a bit for better visibility
      this.path = new Phaser.Curves.Path(50, pathY);
      this.path.lineTo(750, pathY);
      this.path.lineTo(750, this.gameArea.y + this.gameArea.height - 100);
      this.path.lineTo(50, this.gameArea.y + this.gameArea.height - 100);
  
      // For debugging, draw the path
      this.graphics = this.add.graphics();
      this.graphics.lineStyle(3, 0xffffff, 0.5);
      this.path.draw(this.graphics);
  
      // Create groups for enemies and bullets
      this.enemies = this.physics.add.group();
      this.bullets = this.physics.add.group();
  
      // Array to hold towers in the scene
      this.towers = [];
  
      // Initialize game stats
      this.initializeGameStats();
      
      // Create UI elements
      this.createTopUI();
      
      // Define turret types (moved to separate method)
      this.defineTurretTypes();
      
      // Track which turret type is currently selected
      this.selectedTurretType = 0;
  
      // Create turret selection UI at bottom
      this.createTurretSelectionUI();
  
      // Initialize wave system
      this.initializeWaveSystem();
      
      // Listen for clicks on the game world to place a turret
      this.input.on('pointerdown', (pointer) => {
        // Only allow placement within the game area
        if (pointer.y > this.gameArea.y && pointer.y < this.gameArea.y + this.gameArea.height) {
          this.placeTower(pointer);
        }
      }, this);
  
      // Add overlap so bullets can hit enemies
      this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
    }

    createUIBars() {
      // Top UI bar
      this.add.rectangle(400, 30, 800, 60, 0x222222)
        .setOrigin(0.5)
        .setDepth(1);

      // Bottom UI bar
      this.add.rectangle(400, 560, 800, 80, 0x222222)
        .setOrigin(0.5)
        .setDepth(1);
    }

    initializeGameStats() {
      this.score = 0;
      this.lives = 3;
      this.currency = 100;
      this.lastLifeLost = 0; // Add timestamp to prevent multiple life loss
    }

    updateLivesDisplay() {
      // Helper method to consistently format lives
      this.livesText.setText(`${this.lives}`);
    }

    createTopUI() {
      const topBarY = 30;
      const textStyle = { font: '20px Arial', fill: '#ffffff' };
      const valueStyle = { font: '24px Arial', fill: '#ffffff' };

      // Score section
      this.add.text(20, topBarY - 20, 'SCORE', textStyle).setDepth(2);
      this.scoreText = this.add.text(20, topBarY + 5, '0', valueStyle).setDepth(2);

      // Wave section (centered)
      this.waveText = this.add.text(400, topBarY, 'WAVE 1/3', {
        font: '24px Arial',
        fill: '#ffffff'
      }).setOrigin(0.5).setDepth(2);

      // Lives section (right aligned)
      const livesIcon = this.add.text(620, topBarY, '❤️', { font: '24px Arial' }).setDepth(2);
      this.livesText = this.add.text(650, topBarY, '3', valueStyle).setDepth(2);

      // Currency section (right aligned)
      const moneyIcon = this.add.text(700, topBarY, '💰', { font: '24px Arial' }).setDepth(2);
      this.currencyText = this.add.text(730, topBarY, '$100', valueStyle).setDepth(2);
    }

    updateCurrencyDisplay() {
      // Helper method to consistently format currency
      this.currencyText.setText(`$${this.currency}`);
    }

    createTurretSelectionUI() {
        const padding = 20;
        const buttonWidth = 120;
        const buttonHeight = 80;  // Increased height for better spacing
        const startY = 530;  // Moved up slightly
        const startX = (800 - (this.turretTypes.length * (buttonWidth + padding) - padding)) / 2;

        this.turretButtons = [];

        this.turretTypes.forEach((turret, index) => {
            const x = startX + (buttonWidth + padding) * index;
            
            // Create button container
            const container = this.add.container(x, startY);
            container.setDepth(2);
            
            // Create button background with rounded corners
            const button = this.add.rectangle(0, 0, buttonWidth, buttonHeight, turret.color)
                .setInteractive()
                .setOrigin(0, 0);

            // Add inner glow effect using a slightly larger rectangle behind
            const glow = this.add.rectangle(0, 0, buttonWidth, buttonHeight, turret.color, 0.3)
                .setOrigin(0, 0)
                .setScale(1.1)
                .setVisible(false);

            // Add turret visual representation (circle)
            const turretIcon = this.add.circle(buttonWidth/2, 20, 10, turret.color)
                .setStrokeStyle(2, 0xffffff);

            // Add turret name with shadow
            const nameText = this.add.text(buttonWidth/2, 40, turret.name, {
                font: 'bold 18px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5)
              .setShadow(1, 1, '#000000', 3);

            // Add cost with icon
            const costText = this.add.text(buttonWidth/2, 65, `💰${turret.cost}`, {
                font: '16px Arial',
                fill: '#ffff00'
            }).setOrigin(0.5)
              .setShadow(1, 1, '#000000', 2);

            container.add([glow, button, turretIcon, nameText, costText]);

            // Enhanced hover effects
            button.on('pointerover', () => {
                if (this.selectedTurretType !== index) {
                    button.setStrokeStyle(2, 0xffffff);
                    glow.setVisible(true);
                    container.setScale(1.05);
                    this.tweens.add({
                        targets: container,
                        y: startY - 5,
                        duration: 100
                    });
                }
            });

            button.on('pointerout', () => {
                if (this.selectedTurretType !== index) {
                    button.setStrokeStyle(0);
                    glow.setVisible(false);
                    container.setScale(1);
                    this.tweens.add({
                        targets: container,
                        y: startY,
                        duration: 100
                    });
                }
            });

            // Selection handler
            button.on('pointerdown', () => {
                this.selectedTurretType = index;
                
                // Update all buttons
                this.turretButtons.forEach((btn, i) => {
                    const isSelected = i === index;
                    btn.button.setStrokeStyle(isSelected ? 3 : 0, 0xffffff);
                    btn.glow.setVisible(isSelected);
                    btn.container.setScale(isSelected ? 1.05 : 1);
                    this.tweens.add({
                        targets: btn.container,
                        y: isSelected ? startY - 5 : startY,
                        duration: 100
                    });
                });
            });

            this.turretButtons.push({
                button,
                container,
                glow
            });
        });

        // Set initial selection
        const initialBtn = this.turretButtons[0];
        initialBtn.button.setStrokeStyle(3, 0xffffff);
        initialBtn.glow.setVisible(true);
        initialBtn.container.setScale(1.05);
        initialBtn.container.y = startY - 5;
    }

    defineTurretTypes() {
      this.turretTypes = [
        {
          name: 'Basic',
          color: 0x00ff00,      // Green
          range: 150,
          fireRate: 1000,       // Fire once every 1 second
          bulletSpeed: 500,      // Increased from 300
          bulletDamage: 1,
          bulletColor: 0xffff00, // Yellow
          cost: 50              // Cheapest option
        },
        {
          name: 'Sniper',
          color: 0x0000ff,      // Blue
          range: 300,
          fireRate: 2000,       // Fire once every 2 seconds
          bulletSpeed: 800,      // Increased from 500
          bulletDamage: 2,
          bulletColor: 0xff00ff, // Magenta
          cost: 100             // Medium price
        },
        {
          name: 'Rapid',
          color: 0xff0000,      // Red
          range: 100,
          fireRate: 300,        // Fire ~3 times per second
          bulletSpeed: 600,      // Increased from 350
          bulletDamage: 0.5,
          bulletColor: 0xffffff, // White
          cost: 150             // Most expensive
        }
      ];
    }

    initializeWaveSystem() {
        // Add enemy type definitions
        this.enemyTypes = {
            basic: {
                hp: 3,
                speed: 12000,
                scale: 1,
                color: 0xff0000,
                reward: 20,
                score: 10
            },
            fast: {
                hp: 2,
                speed: 8000,
                scale: 0.8,
                color: 0x00ff00,
                reward: 25,
                score: 15
            },
            tank: {
                hp: 8,
                speed: 15000,
                scale: 1.5,
                color: 0x0000ff,
                reward: 35,
                score: 25
            },
            boss: {
                hp: 15,
                speed: 15000,
                scale: 2,
                color: 0xFF00FF,
                reward: 100,
                score: 50,
                spawnOnDeath: 4
            },
            minion: {  // Spawned from boss
                hp: 2,
                speed: 10000,
                scale: 0.7,
                color: 0xFF00FF,
                reward: 15,
                score: 10
            }
        };

        this.waves = [
            {
                name: 'Wave 1 - Basic',
                enemies: [
                    { count: 3, delay: 2000, type: 'basic' },
                    { count: 2, delay: 1000, type: 'fast' }
                ]
            },
            {
                name: 'Wave 2 - Groups',
                enemies: [
                    { count: 2, delay: 500, type: 'tank' },
                    { delay: 3000 },
                    { count: 4, delay: 500, type: 'fast' },
                    { delay: 3000 },
                    { count: 3, delay: 400, type: 'basic' }
                ]
            },
            {
                name: 'Wave 3 - Boss',
                enemies: [
                    { count: 1, delay: 1000, type: 'boss' }
                ]
            }
        ];

        // Wave system state
        this.waveState = {
            currentWave: 0,
            enemyIndex: 0,
            isSpawning: false,
            isWaveInProgress: false,
            isWaitingForNextWave: false,
            enemiesSpawnedThisWave: 0,
            enemiesKilledThisWave: 0,
            totalEnemiesInWave: 0
        };

        this.startNextWave();
    }

    calculateTotalEnemiesInWave(waveIndex) {
        const wave = this.waves[waveIndex];
        let total = 0;
        
        wave.enemies.forEach(config => {
            if (config.count) {
                if (config.type === 'boss') {
                    // Count boss plus its spawned enemies
                    total += 1 + (config.spawnOnDeath || 0);
                } else {
                    total += config.count;
                }
            }
        });
        
        return total;
    }

    startNextWave() {
        if (this.waveState.currentWave >= this.waves.length) {
            if (this.enemies.getChildren().length === 0) {
                this.scene.start('VictoryScene', { score: this.score });
            }
            return;
        }

        // Reset wave state
        this.waveState.enemyIndex = 0;
        this.waveState.isSpawning = true;
        this.waveState.isWaveInProgress = true;
        this.waveState.isWaitingForNextWave = false;
        this.waveState.enemiesSpawnedThisWave = 0;
        this.waveState.enemiesKilledThisWave = 0;
        this.waveState.totalEnemiesInWave = this.calculateTotalEnemiesInWave(this.waveState.currentWave);
        
        // Update UI
        this.waveText.setText(`WAVE ${this.waveState.currentWave + 1}/3`);

        // Show wave announcement
        const wave = this.waves[this.waveState.currentWave];
        this.showWaveAnnouncement(wave.name);

        // Start spawning after announcement
        this.time.delayedCall(2000, () => {
            this.scheduleNextEnemy();
        });
    }

    scheduleNextEnemy() {
        if (!this.waveState.isSpawning) return;

        const wave = this.waves[this.waveState.currentWave];
        if (!wave) return;

        const enemyConfig = wave.enemies[this.waveState.enemyIndex];

        if (!enemyConfig) {
            // No more enemies to spawn in this wave
            this.waveState.isSpawning = false;
            return;
        }

        if (enemyConfig.delay && !enemyConfig.count) {
            // This is just a delay entry
            this.time.delayedCall(enemyConfig.delay, () => {
                this.waveState.enemyIndex++;
                this.scheduleNextEnemy();
            });
            return;
        }

        // Schedule enemy spawn
        this.time.delayedCall(enemyConfig.delay || 0, () => {
            if (enemyConfig.count > 0) {
                this.spawnEnemy(enemyConfig);
                this.waveState.enemiesSpawnedThisWave++;
                enemyConfig.count--;
                
                if (enemyConfig.count <= 0) {
                    this.waveState.enemyIndex++;
                }
                this.scheduleNextEnemy();
            } else {
                this.waveState.enemyIndex++;
                this.scheduleNextEnemy();
            }
        });
    }

    checkWaveCompletion() {
        // Don't check if we're already waiting for next wave
        if (this.waveState.isWaitingForNextWave) return;
        
        // Check if all enemies are dead and no more spawning
        const noMoreSpawning = !this.waveState.isSpawning;
        const allEnemiesDead = this.waveState.enemiesKilledThisWave >= this.waveState.totalEnemiesInWave;
        const noActiveEnemies = this.enemies.getChildren().length === 0;

        if (noMoreSpawning && allEnemiesDead && noActiveEnemies) {
            this.waveState.isWaveInProgress = false;
            this.waveState.isWaitingForNextWave = true;

            // Prepare for next wave
            this.time.delayedCall(2000, () => {
                // Give bonus money between waves
                this.currency += 50;
                this.updateCurrencyDisplay();
                
                this.waveState.currentWave++;
                this.startNextWave();
            });
        }
    }

    spawnEnemy(config) {
        const enemyType = this.enemyTypes[config.type];
        const pathStart = this.path.getStartPoint();
        let enemy = this.add.follower(this.path, pathStart.x, pathStart.y, 'enemy');
        this.physics.add.existing(enemy);
        
        // Set enemy properties from type configuration
        enemy.hp = enemyType.hp;
        enemy.speed = enemyType.speed;
        enemy.scale = enemyType.scale;
        enemy.reward = enemyType.reward;
        enemy.score = enemyType.score;
        enemy.spawnOnDeath = enemyType.spawnOnDeath || 0;
        enemy.type = config.type;
        enemy.reachedEnd = false;
        enemy.active = true;
        
        enemy.setScale(enemyType.scale);
        enemy.setTint(enemyType.color);
        
        enemy.startFollow({
            duration: enemy.speed,
            onComplete: () => {
                if (enemy.active && !enemy.reachedEnd) {
                    enemy.reachedEnd = true;
                    if (this.lives > 0) {
                        this.lives--;
                        this.updateLivesDisplay();
                        
                        if (this.lives <= 0) {
                            this.scene.start('DefeatScene', { score: this.score });
                            return;
                        }
                    }
                }
                this.waveState.enemiesKilledThisWave++;
                enemy.active = false;
                this.enemies.remove(enemy, true, true);
                this.checkWaveCompletion();
            }
        });
    
        this.enemies.add(enemy);
    }

    placeTower(pointer) {
      // Retrieve the currently selected turret type
      const turretData = this.turretTypes[this.selectedTurretType];
      
      // Check if player can afford the turret
      if (this.currency >= turretData.cost) {
        // Create a tower at the pointer position
        let tower = this.add.circle(pointer.x, pointer.y, 15, turretData.color);
        tower.range = turretData.range;
        tower.fireRate = turretData.fireRate;
        tower.lastFired = 0;
        tower.bulletSpeed = turretData.bulletSpeed;
        tower.bulletDamage = turretData.bulletDamage;
        tower.bulletColor = turretData.bulletColor;
    
        // Deduct the cost and update currency display
        this.currency -= turretData.cost;
        this.updateCurrencyDisplay();
    
        this.towers.push(tower);
      } else {
        // Show "Cannot afford" message
        const cannotAffordText = this.add.text(pointer.x, pointer.y - 20, 'Cannot afford!', {
            font: '16px Arial',
            fill: '#ff0000'
        }).setOrigin(0.5);
        
        // Remove the text after 1 second
        this.time.delayedCall(1000, () => {
            cannotAffordText.destroy();
        });
      }
    }
  
    update(time, delta) {
      // For each tower, check if it can fire at an enemy.
      this.towers.forEach(tower => {
        if (time > tower.lastFired + tower.fireRate) {
          let enemy = this.getEnemyInRange(tower);
          if (enemy) {
            this.fireBullet(tower, enemy);
            tower.lastFired = time;
          }
        }
      });
  
      // Update bullets and handle cleanup
      this.bullets.getChildren().forEach(bullet => {
        if (!bullet || !bullet.active) return;

        if (bullet.target && bullet.target.active && !bullet.target.reachedEnd) {
          let angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, bullet.target.x, bullet.target.y);
          bullet.body.setVelocity(
            Math.cos(angle) * bullet.speed,
            Math.sin(angle) * bullet.speed
          );
        } else {
          bullet.destroy();
        }
  
        // Remove bullet if it goes off screen
        if (bullet.active && (
          bullet.x < -50 || bullet.x > this.sys.canvas.width + 50 ||
          bullet.y < -50 || bullet.y > this.sys.canvas.height + 50
        )) {
          bullet.destroy();
        }
      });

      // Clean up any enemies that are no longer active
      this.enemies.getChildren().forEach(enemy => {
        if (!enemy.active || enemy.reachedEnd) {
          this.enemies.remove(enemy, true, true);
        }
      });
    }
  
    getEnemyInRange(tower) {
      // Only target active enemies that haven't reached the end
      let enemyInRange = null;
      this.enemies.getChildren().forEach(enemy => {
        if (enemy.active && !enemy.reachedEnd) {
          let distance = Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y);
          if (distance <= tower.range) {
            enemyInRange = enemy;
          }
        }
      });
      return enemyInRange;
    }
  
    fireBullet(tower, enemy) {
      // Create a bullet as a small circle with the tower's bullet color.
      let bullet = this.add.circle(tower.x, tower.y, 5, tower.bulletColor);
      this.physics.add.existing(bullet);
      bullet.body.setCircle(5);
      bullet.speed = tower.bulletSpeed;
      bullet.damage = tower.bulletDamage;
      // Store the target so we can update bullet velocity each frame.
      bullet.target = enemy;
  
      this.bullets.add(bullet);
    }
  
    hitEnemy(bullet, enemy) {
        if (!enemy.reachedEnd) {
            enemy.hp -= bullet.damage;
            bullet.destroy();
        
            if (enemy.hp <= 0) {
                if (enemy.spawnOnDeath) {
                    this.waveState.totalEnemiesInWave += enemy.spawnOnDeath;
                    
                    for (let i = 0; i < enemy.spawnOnDeath; i++) {
                        this.spawnEnemy({
                            type: 'minion'
                        });
                    }
                }
    
                this.currency += enemy.reward;
                this.updateCurrencyDisplay();
    
                this.waveState.enemiesKilledThisWave++;
                enemy.destroy();
                this.score += enemy.score;
                this.scoreText.setText(this.score);
                
                this.checkWaveCompletion();
            }
        }
    }

    showWaveAnnouncement(waveName) {
        // Create wave announcement text
        const announcement = this.add.text(400, 300, waveName, {
            font: 'bold 48px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { blur: 10, color: '#000000', fill: true }
        }).setOrigin(0.5)
          .setAlpha(0)
          .setDepth(100);  // Make sure it appears on top

        // Animate the announcement
        this.tweens.add({
            targets: announcement,
            alpha: 1,
            y: 280,
            duration: 500,
            ease: 'Power2',
            yoyo: true,
            hold: 1000,
            onComplete: () => {
                announcement.destroy();
            }
        });
    }
}

class VictoryScene extends Phaser.Scene {
    constructor() {
        super('VictoryScene');
    }

    init(data) {
        this.finalScore = data.score;
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // Add victory text
        this.add.text(centerX, centerY - 100, 'Victory!', {
            font: '64px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Add score text
        this.add.text(centerX, centerY, `Final Score: ${this.finalScore}`, {
            font: '32px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Add replay button
        const replayButton = this.add.text(centerX, centerY + 100, 'Play Again', {
            font: '32px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5)
        .setInteractive()
        .setPadding(15)
        .setStyle({ backgroundColor: '#111' });

        replayButton.on('pointerdown', () => {
            this.scene.start('MainScene');
        });

        replayButton.on('pointerover', () => {
            replayButton.setStyle({ fill: '#ff0' });
        });

        replayButton.on('pointerout', () => {
            replayButton.setStyle({ fill: '#fff' });
        });
    }
}

class DefeatScene extends Phaser.Scene {
    constructor() {
        super('DefeatScene');
    }

    init(data) {
        this.finalScore = data.score;
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // Add defeat text
        this.add.text(centerX, centerY - 100, 'Game Over!', {
            font: '64px Arial',
            fill: '#ff0000'
        }).setOrigin(0.5);

        // Add score text
        this.add.text(centerX, centerY, `Final Score: ${this.finalScore}`, {
            font: '32px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Add retry button
        const retryButton = this.add.text(centerX, centerY + 100, 'Try Again', {
            font: '32px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5)
        .setInteractive()
        .setPadding(15)
        .setStyle({ backgroundColor: '#111' });

        retryButton.on('pointerdown', () => {
            this.scene.start('MainScene');
        });

        retryButton.on('pointerover', () => {
            retryButton.setStyle({ fill: '#ff0' });
        });

        retryButton.on('pointerout', () => {
            retryButton.setStyle({ fill: '#fff' });
        });
    }
}
