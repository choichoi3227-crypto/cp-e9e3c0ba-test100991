<?php
/**
 * CloudPress WordPress 설정 (자동 생성)
 * DB: GitHub 레포 내 _db/wordpress.db (SQLite)
 */

// ── SQLite 연동 (sqlite-database-integration 플러그인) ──
define( 'DB_NAME',     'wordpress' );
define( 'DB_USER',     'root' );
define( 'DB_PASSWORD', '' );
define( 'DB_HOST',     'localhost' );
define( 'DB_CHARSET',  'utf8mb4' );
define( 'DB_COLLATE',  '' );
define( 'table_prefix', 'wp_' );

// SQLite 플러그인 설정
define( 'SQLITE_DB_DIR',  __DIR__ . '/_db/' );
define( 'SQLITE_DB_FILE', 'wordpress.db' );

// ── 인증 키/솔트 ──
define( 'AUTH_KEY',         '3n0lcg3eyxn1q3nt38g6b4yxxyy4ams9i1lokxti935v0w6trbc357fu7lo9tmw0' );
define( 'SECURE_AUTH_KEY',  'nrsmozy6jvv25db0n6ppyulawlqz81cqkyjjvm3stzyxb9l2kn899dwfjzmu3ztr' );
define( 'LOGGED_IN_KEY',    'y3g0olif4vtotoomgx9uhiw0zub756z3rgil52cqx100586iqv6j8jdtvwkhx9m9' );
define( 'NONCE_KEY',        'eyuoahuqqtnnvairtzrfjumbh57q888glc2fclo1dhqjp1rcviodjlfpbcz3bs2w' );
define( 'AUTH_SALT',        'byosyd6ozzwdlzbhymujytx4p5posbcqe4dwrwgm9qg8wtn165790ad514ilheut' );
define( 'SECURE_AUTH_SALT', '881rnbtyup30bjlmezfwgp5kqxpn0eyh01ywgcznd0f4coojn0pr1eco09o462l4' );
define( 'LOGGED_IN_SALT',   '1lwo9occwb19vm9b04ehw5gsuo50fkboy8iai55gpjoevndbbyx2p04tdm1i7omu' );
define( 'NONCE_SALT',       'aw1pzogzjtozro9e5neftb8apq4zlyd4zs53t964nuwqam7fv6mprn30tk12muu6' );

// ── URL 설정 ──
define( 'WP_HOME',    'https://cp-e9e3c0ba-wp.choichoi3227.workers.dev' );
define( 'WP_SITEURL', 'https://cp-e9e3c0ba-wp.choichoi3227.workers.dev' );

// ── 기타 ──
define( 'WP_DEBUG',        false );
define( 'WP_CACHE',        true  );
define( 'WP_AUTO_UPDATE_CORE', false );
define( 'DISALLOW_FILE_EDIT',  false );

if ( ! defined( 'ABSPATH' ) ) {
  define( 'ABSPATH', __DIR__ . '/' );
}
require_once ABSPATH . 'wp-settings.php';
