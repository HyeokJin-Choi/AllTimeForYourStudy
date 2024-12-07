import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class MedalPopup extends StatefulWidget {
  final int userId; // userId
  final int medalId; // medalId

  MedalPopup({required this.userId, required this.medalId});

  @override
  _MedalPopupState createState() => _MedalPopupState();
}

class _MedalPopupState extends State<MedalPopup> {
  late Future<Map<String, String>> medalData;

  @override
  void initState() {
    super.initState();
    // Initialize the future to fetch medal data using both userId and medalId
    medalData = fetchMedalData(widget.userId, widget.medalId);
  }

  // Fetch medal data from the API or database (adjust URL as necessary)
  Future<Map<String, String>> fetchMedalData(int userId, int medalId) async {
    // Send both userId and medalId to the server
    final response = await http.post(
      Uri.parse('http://116.124.191.174:15023/get-medal-info'), // Server URL
      headers: {
        'Content-Type': 'application/json',
      },
      body: json.encode({
        'userId': userId, // Send userId
        'medalId': medalId, // Send medalId
      }),
    );

    if (response.statusCode == 200) {
      // Parse the JSON response
      Map<String, dynamic> data = json.decode(response.body);
      // Return data with default values if some fields are missing
      return {
        'get_date': data['get_date'] ?? 'N/A',  // Default to 'N/A' if value is missing
        'ranking': data['ranking']?.toString() ?? 'N/A',  // Convert int to String
        'school_name': data['school_name'] ?? 'N/A',
        'monthly_total_time': data['monthly_total_time']?.toString() ?? 'N/A', // Convert int to String
        'battle_inf': data['battle_inf'] ?? 'N/A',
        'school_local': data['school_local'] ?? 'N/A',
      };
    } else {
      throw Exception('Failed to load medal data');
    }
  }

  String _formatTime(dynamic time) {
    if (time is String) {
      // If time is a String, try to convert it to int first
      try {
        time = int.parse(time); // Convert to int
      } catch (e) {
        return '0시간 0분'; // If conversion fails, return default value
      }
    }

    if (time is int) {
      int hours = time ~/ 60;  // 60으로 나누어 시간을 구함
      int minutes = time % 60;  // 나머지로 분을 구함
      return '${hours}시간 ${minutes}분';
    }

    return '0시간 0분'; // 기본값
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, String>>(
      future: medalData,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Center(child: CircularProgressIndicator());
        } else if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        } else if (snapshot.hasData) {
          var medalInfo = snapshot.data!;
          return AlertDialog(
            backgroundColor: Colors.transparent,
            content: Container(
              width: 300,
              height: 400,
              decoration: BoxDecoration(
                image: DecorationImage(
                  image: AssetImage('assets/images/certificate.png'),
                  fit: BoxFit.contain,
                ),
                borderRadius: BorderRadius.circular(15),
              ),
              padding: EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  SizedBox(height: 10),
                  Text(
                    "${medalInfo['battle_inf']}",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  SizedBox(height: 10),
                  Text("획득년도 : ${medalInfo['get_date']}", style: TextStyle(color: Colors.black87), textAlign: TextAlign.center),
                  Text("등수 : ${medalInfo['ranking']}", style: TextStyle(color: Colors.black87), textAlign: TextAlign.center),
                  Text("학교명 : ${medalInfo['school_name']}", style: TextStyle(color: Colors.black87), textAlign: TextAlign.center),
                  Text("누적시간 : ${_formatTime(medalInfo['monthly_total_time'])}", style: TextStyle(color: Colors.black87), textAlign: TextAlign.center),
                  Text("지역 : ${medalInfo['school_local']}", style: TextStyle(color: Colors.black87), textAlign: TextAlign.center),
                  SizedBox(height: 20),
                  TextButton(
                    child: Text(
                      '확인',
                      style: TextStyle(
                        color: const Color.fromARGB(255, 16, 79, 131),
                        fontSize: 16,
                      ),
                    ),
                    onPressed: () {
                      Navigator.of(context).pop();
                    },
                  ),
                ],
              ),
            ),
          );
        } else {
          return Center(child: Text('No data available'));
        }
      },
    );
  }
}
