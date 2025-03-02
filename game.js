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
        // Add these properties after the other initialization
        this.selectedTurret = null;
        this.turretDetailsPanel = null;
        this.placementPreview = null;  // Add this line after other initializations

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
      this.selectedTurretType = null; // Changed from 0 to null
  
      // Create turret selection UI at bottom
      this.createTurretSelectionUI();
  
      // Initialize wave system
      this.initializeWaveSystem();
      
      // Replace the two duplicate pointerdown handlers with this single one
      this.input.on('pointerdown', (pointer) => {
        // Only process clicks within the game area
        if (pointer.y > this.gameArea.y && pointer.y < this.gameArea.y + this.gameArea.height) {
            if (this.selectedTurret) {
                // If we have a selected turret and clicked outside of it, deselect it
                if (!this.selectedTurret.getBounds().contains(pointer.x, pointer.y)) {
                    this.deselectTurret();
                }
            } else {
                // If no turret is selected, try to place a new one
                this.placeTower(pointer);
            }
        }
      });

      // Add overlap so bullets can hit enemies
      this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);

      // Modify the input listener to also handle preview
      this.input.on('pointermove', (pointer) => {
        if (this.selectedTurretType !== null) {
            this.updatePlacementPreview(pointer);
        }
      });
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
        const buttonHeight = 80;
        const startY = 530;
        const startX = (800 - (this.turretTypes.length * (buttonWidth + padding) - padding)) / 2;

        this.turretButtons = [];

        this.turretTypes.forEach((turret, index) => {
            const x = startX + (buttonWidth + padding) * index;
            
            // Create button container
            const container = this.add.container(x, startY);
            container.setDepth(2);
            
            // Create modern button background
            const button = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x222222)
                .setInteractive()
                .setOrigin(0, 0)
                .setStrokeStyle(1, 0x444444);  // Fixed duplicate setStrokeStyle

            // Add subtle gradient overlay
            const gradient = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0xffffff, 0.05)
                .setOrigin(0, 0);

            // Add turret icon with colored circle background
            const iconBg = this.add.circle(buttonWidth/2, 22, 15, turret.color, 0.2)
                .setStrokeStyle(2, turret.color);
            const turretIcon = this.add.circle(buttonWidth/2, 22, 8, turret.color);

            // Add turret name with modern style
            const nameText = this.add.text(buttonWidth/2, 45, turret.name, {
                font: 'bold 16px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);

            // Add cost with modern style
            const costText = this.add.text(buttonWidth/2, 65, `${turret.cost}`, {
                font: '14px Arial',
                fill: '#ffcc00'
            }).setOrigin(0.5)
              .setShadow(1, 1, '#000000', 2);
            const coinIcon = this.add.text(costText.x - (costText.width/2) - 15, 65, '💰', {
                font: '12px Arial',
                fill: '#ffcc00'
            }).setOrigin(0.5);

            container.add([button, gradient, iconBg, turretIcon, nameText, costText, coinIcon]);

            // Button hover effects
            button.on('pointerover', () => {
                if (this.selectedTurretType !== index) {
                    button.setStrokeStyle(2, 0xffffff);
                    gradient.setAlpha(0.1);
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
                    button.setStrokeStyle(1, 0x444444);
                    gradient.setAlpha(0.05);
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
                if (this.selectedTurretType === index) {
                    // Deselect if clicking the same turret
                    this.deselectTurretType();
                } else {
                    this.selectedTurretType = index;
                    
                    // Update all buttons
                    this.turretButtons.forEach((btn, i) => {
                        const isSelected = i === index;
                        btn.button.setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0xffcc00 : 0x444444);
                        btn.gradient.setAlpha(isSelected ? 0.15 : 0.05);
                        btn.container.setScale(isSelected ? 1.1 : 1);
                        btn.container.y = isSelected ? startY - 10 : startY;
                    });
                }
            });

            this.turretButtons.push({
                button,
                container,
                gradient
            });
        });
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
        // Only allow placement if a turret type is selected
        if (this.selectedTurretType === null) {
            // Only show help text if we're not already showing a preview
            if (!this.placementPreview) {
                const helpText = this.add.text(pointer.x, pointer.y - 20, 'Select a turret first!', {
                    font: '16px Arial',
                    fill: '#ffffff'
                }).setOrigin(0.5);
                
                this.tweens.add({
                    targets: helpText,
                    alpha: 0,
                    y: pointer.y - 40,
                    duration: 1000,
                    onComplete: () => helpText.destroy()
                });
            }
            return;
        }

        const turretData = this.turretTypes[this.selectedTurretType];
        if (this.currency >= turretData.cost) {
            let tower = this.add.circle(pointer.x, pointer.y, 15, turretData.color)
                .setInteractive()
                .on('pointerdown', (pointer) => {
                    pointer.event.stopPropagation();
                    this.selectTurret(tower);
                });

            // Add all the tower properties
            tower.range = turretData.range;
            tower.fireRate = turretData.fireRate;
            tower.lastFired = 0;
            tower.bulletSpeed = turretData.bulletSpeed;
            tower.bulletDamage = turretData.bulletDamage;
            tower.bulletColor = turretData.bulletColor;
            tower.type = this.selectedTurretType;
            tower.kills = 0;
            tower.totalDamageDealt = 0;

            this.currency -= turretData.cost;
            this.updateCurrencyDisplay();
            this.towers.push(tower);

            // Deselect turret type after placing
            this.deselectTurretType();
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

    deselectTurretType() {
        this.turretButtons.forEach((btn) => {
            btn.button.setStrokeStyle(1, 0x444444);
            btn.gradient.setAlpha(0.05);
            btn.container.y = 530;
        });
        if (this.placementPreview) {
            this.placementPreview.destroy();
            this.placementPreview = null;
        }
        this.selectedTurretType = null;
    }

    selectTurret(tower) {
        // Deselect previous turret if any
        this.deselectTurret();

        this.selectedTurret = tower;
        
        // Visual feedback for selected turret
        tower.setStrokeStyle(2, 0xffff00);
        
        // Show range circle
        this.rangeCircle = this.add.circle(tower.x, tower.y, tower.range)
            .setStrokeStyle(1, 0xffff00, 0.3)
            .setFillStyle(0xffff00, 0.1);

        // Create details panel
        this.createTurretDetailsPanel(tower);
    }

    deselectTurret() {
        if (this.selectedTurret) {
            this.selectedTurret.setStrokeStyle(0);
            this.selectedTurret = null;
        }
        
        if (this.rangeCircle) {
            this.rangeCircle.destroy();
            this.rangeCircle = null;
        }

        if (this.turretDetailsPanel) {
            this.turretDetailsPanel.destroy();
            this.turretDetailsPanel = null;
        }
    }

    createTurretDetailsPanel(tower) {
        const turretData = this.turretTypes[tower.type];
        const padding = 10;
        const panelWidth = 200;
        const panelHeight = 180;
        let panelX = tower.x + 30;
        let panelY = tower.y;

        // Calculate sell price - 70% of original cost
        const sellPrice = Math.floor(turretData.cost * 0.7);

        // Adjust panel position if it would go off screen
        if (panelX + panelWidth > this.game.config.width) {
            panelX = tower.x - panelWidth - 30;
        }
        if (panelY + panelHeight > this.gameArea.y + this.gameArea.height) {
            panelY = this.gameArea.y + this.gameArea.height - panelHeight;
        }

        // Create panel container
        this.turretDetailsPanel = this.add.container(panelX, panelY);

        // Panel background
        const background = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x000000, 0.8)
            .setOrigin(0)
            .setStrokeStyle(1, turretData.color);

        // Panel contents
        const titleText = this.add.text(padding, padding, turretData.name + ' Turret', {
            font: 'bold 16px Arial',
            fill: '#ffffff'
        });

        const stats = [
            `Damage: ${tower.bulletDamage}`,
            `Fire Rate: ${1000/tower.fireRate}/s`,
            `Range: ${tower.range}`,
            `Kills: ${tower.kills}`,
            `Total Damage: ${Math.floor(tower.totalDamageDealt)}`
        ];

        const statsText = stats.map((stat, i) => {
            return this.add.text(padding, 40 + (i * 20), stat, {
                font: '14px Arial',
                fill: '#ffffff'
            });
        });

        // Update sell button with clearer price display
        const sellButton = this.add.rectangle(padding, panelHeight - 30, panelWidth - (padding * 2), 25, 0x880000)
            .setOrigin(0)
            .setInteractive();
        
        const sellText = this.add.text(padding + (panelWidth - padding * 2)/2, panelHeight - 30 + 12.5, 
            `Sell (+${sellPrice}$)`, {
            font: '14px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Update sell button handler
        sellButton.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation(); // Prevent event from triggering tower placement
            const oldCurrency = this.currency;
            this.currency = oldCurrency + sellPrice;  // Add the sell price to existing currency
            this.updateCurrencyDisplay();
            this.towers = this.towers.filter(t => t !== tower);
            tower.destroy();
            this.deselectTurret();
        });

        // Add everything to the panel
        this.turretDetailsPanel.add([background, titleText, ...statsText, sellButton, sellText]);
        this.turretDetailsPanel.setDepth(100);
    }

    updatePlacementPreview(pointer) {
        if (!this.placementPreview) {
            // Create preview container
            this.placementPreview = this.add.container(0, 0);
            
            // Create range circle
            const turretData = this.turretTypes[this.selectedTurretType];
            const rangeCircle = this.add.circle(0, 0, turretData.range)
                .setStrokeStyle(2, turretData.color, 0.3)
                .setFillStyle(turretData.color, 0.1);
            
            // Create turret preview
            const turretPreview = this.add.circle(0, 0, 15, turretData.color, 0.7);
            
            this.placementPreview.add([rangeCircle, turretPreview]);
        }

        // Update preview position
        this.placementPreview.setPosition(pointer.x, pointer.y);

        // Update preview alpha based on whether we can afford it
        const turretData = this.turretTypes[this.selectedTurretType];
        const canAfford = this.currency >= turretData.cost;
        this.placementPreview.setAlpha(canAfford ? 1 : 0.3);
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
            
            // Find the tower that shot this bullet and update its stats
            const tower = this.towers.find(t => 
                Phaser.Math.Distance.Between(bullet.x, bullet.y, t.x, t.y) < 20
            );
            if (tower) {
                tower.totalDamageDealt += bullet.damage;
                if (enemy.hp <= 0) {
                    tower.kills++;
                }
                // Update panel if this tower is selected
                if (this.selectedTurret === tower && this.turretDetailsPanel) {
                    this.createTurretDetailsPanel(tower);
                }
            }

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
